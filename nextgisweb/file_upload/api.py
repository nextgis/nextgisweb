import re
from base64 import b64decode
from shutil import copyfileobj
from typing import Annotated, List, Union

import magic
import pyramid.httpexceptions as exc
from msgspec import UNSET, Meta, Struct, UnsetType
from pyramid.response import Response

from nextgisweb.env import gettext, inject
from nextgisweb.lib.apitype import AnyOf, AsJSON, StatusCode

from nextgisweb.core import CoreComponent
from nextgisweb.core.exception import UserException

from .component import FileUploadComponent
from .model import FileUpload, FileUploadID, FileUploadNotCompleted, FileUploadNotFound

BUF_SIZE = 1024 * 1024


class UploadedFileTooLarge(UserException):
    title = gettext("Uploaded file too large")
    http_status_code = 413


class FileUploadObject(Struct, kw_only=True):
    id: FileUploadID
    size: Annotated[int, Meta(ge=0)]
    name: Union[str, UnsetType] = UNSET
    mime_type: Union[str, UnsetType] = UNSET


@inject()
def collection_options(request, *, comp: FileUploadComponent) -> Annotated[None, StatusCode(204)]:
    """Query TUS protocol capabilities

    See [the specification](https://tus.io/protocols/resumable-upload#options)
    for additional details.

    :returns: No content"""
    headers = {
        "Tus-Resumable": "1.0.0",
        "Tus-Version": "1.0.0",
        "Tus-Extension": "creation,termination",
        "Tus-Max-Size": str(comp.max_size),
    }
    return Response(status=204, headers=headers)


@inject()
def collection_put(
    request,
    *,
    comp: FileUploadComponent,
    core: CoreComponent,
) -> AsJSON[Annotated[FileUploadObject, StatusCode(201)],]:
    """Upload small file via request body

    :returns: Uploaded file metadata"""

    core.check_storage_limit()

    if request.content_length > comp.max_size:
        raise UploadedFileTooLarge()

    fupload = FileUpload(size=0)

    with fupload.data_path.open("wb") as fd:
        copyfileobj(request.body_file, fd)
        fupload.size = fd.tell()

    cntdisp = request.headers.get("Content-Disposition")
    if cntdisp:
        match = re.match(r'^.*filename="{0,1}(.*?)"{0,1}$', cntdisp)
        if match:
            fupload.name = match.group(1)

    # If MIME-type was not declared on upload, define independently by running
    # file. Standard mimetypes package does it only using extension but we don't
    # always know filename.

    mime_type = request.headers.get("Content-Type")
    if (not mime_type or mime_type == "application/x-www-form-urlencoded") and fupload.size > 0:
        mime_type = magic.from_file(fupload.data_path, mime=True)

    if mime_type:
        fupload.mime_type = mime_type

    fupload.write_meta()

    request.response.status = 201
    return FileUploadObject(
        id=fupload.id,
        size=fupload.size,
        name=fupload.name if fupload.name else UNSET,
        mime_type=fupload.mime_type if fupload.mime_type else UNSET,
    )


class FileUploadFormPost(Struct, kw_only=True):
    upload_meta: List[FileUploadObject]


@inject()
def collection_post(
    request,
    *,
    core: CoreComponent,
) -> AnyOf[Annotated[FileUploadFormPost, StatusCode(200)], Annotated[None, StatusCode(201)],]:
    """Upload one or more small files or start new TUS upload

    Small files can be encoded as `multipart/form-data`. For TUS uploads, refer
    to [the specification](https://tus.io/protocols/resumable-upload#post) for
    additional details."""
    core.check_storage_limit()

    return (
        _collection_post_tus(request)
        if _tus_resumable_header(request)
        else _collection_post_form(request)
    )


@inject()
def _collection_post_form(request, *, comp: FileUploadComponent):
    # File is uploaded as object of class cgi.FieldStorage which has properties
    # type(file type) and filename(file name), there is no file size property so
    # let's add our own implementation.
    def get_file_size(file):
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)
        return size

    # Determine if multi-file upload is taking place
    post = request.POST
    ufiles = post.getall("files[]") if "files[]" in post else [post["file"]]

    upload_meta = []
    for ufile in ufiles:
        size = get_file_size(ufile.file)
        if size > comp.max_size:
            raise UploadedFileTooLarge()

        fupload = FileUpload(size=size, name=ufile.filename, mime_type=ufile.type)
        with fupload.data_path.open("wb") as fd:
            copyfileobj(ufile.file, fd)

        fupload.write_meta()
        upload_meta.append(
            FileUploadObject(
                id=fupload.id,
                size=fupload.size,
                name=fupload.name if fupload.name else UNSET,
                mime_type=fupload.mime_type if fupload.mime_type else UNSET,
            )
        )

    return FileUploadFormPost(upload_meta=upload_meta)


@inject()
def _collection_post_tus(request, *, comp: FileUploadComponent):
    try:
        upload_length = int(request.headers["Upload-Length"])
    except (KeyError, ValueError):
        raise exc.HTTPBadRequest()
    if upload_length > comp.max_size:
        raise UploadedFileTooLarge()

    upload_metadata = _tus_decode_upload_metadata(request.headers.get("Upload-Metadata"))

    fupload = FileUpload(
        size=upload_length,
        name=upload_metadata.get("name"),
        mime_type=upload_metadata.get("mime_type"),
        incomplete=upload_length > 0,
    )

    if upload_length == 0 and fupload.mime_type is None:
        fupload.mime_type = "application/octet-stream"

    fupload.data_path.touch()
    fupload.write_meta()

    return _tus_response(201, location=request.route_url("file_upload.item", id=fupload.id))


class FileUploadFactory:
    def __init__(self, key="id", incomplete_ok=False):
        self.key = key
        self.incomplete_ok = incomplete_ok

    def __call__(self, request) -> FileUpload:
        try:
            return FileUpload(id=request.matchdict[self.key], incomplete_ok=True)
        except FileUploadNotFound as exc:
            exc.http_status_code = 404
            raise

    @property
    def annotations(self):
        return {self.key: FileUploadID}


def item_head_tus(fupload: FileUpload, request) -> Annotated[None, StatusCode(200)]:
    """Read TUS upload metadata

    See [the specification](https://tus.io/protocols/resumable-upload#head)
    for additional details.

    :returns: No data"""

    _tus_resumable_header(request, require=True)

    with fupload.data_path.open("ab") as fd:
        upload_offset = fd.tell()

    return _tus_response(  # type: ignore
        200,
        upload_offset=upload_offset,
        upload_length=fupload.size,
    )


def item_get(fupload: FileUpload, request) -> FileUploadObject:
    """Read metadata of uploaded file

    :returns: Uploaded file metadata"""

    if fupload.incomplete:
        raise FileUploadNotCompleted

    return FileUploadObject(
        id=fupload.id,
        size=fupload.size,
        name=fupload.name if fupload.name else UNSET,
        mime_type=fupload.mime_type if fupload.mime_type else UNSET,
    )


def item_patch_tus(fupload: FileUpload, request) -> Annotated[None, StatusCode(204)]:
    """Append chunk to TUS upload

    See [the specification](https://tus.io/protocols/resumable-upload#patch)
    for additional details.

    :returns: No content"""
    if request.content_type != "application/offset+octet-stream":
        raise exc.HTTPUnsupportedMediaType()

    try:
        upload_offset = int(request.headers["Upload-Offset"])
    except (KeyError, ValueError):
        raise exc.HTTPBadRequest()

    # Don't upload more than declared file size.
    content_length = request.content_length
    if content_length and upload_offset + content_length > fupload.size:
        raise UploadedFileTooLarge()

    with fupload.data_path.open("ab") as fd:
        # Check for upload conflict
        if upload_offset != fd.tell():
            raise exc.HTTPConflict()

        # Copy request body to data file. Input streaming is also supported
        # here is some conditions: uwsgi - does, pserve - doesn't.
        src_fd = request.body_file
        while True:
            buf = src_fd.read(BUF_SIZE)
            if buf is None:
                break
            read = len(buf)
            if len(buf) == 0:
                break
            if upload_offset + read > fupload.size:
                raise UploadedFileTooLarge()
            fd.write(buf)
            upload_offset += read

    if fupload.size == upload_offset:
        fupload.incomplete = False

        # Detect MIME-type if missing
        if not fupload.mime_type:
            fupload.mime_type = magic.from_file(fupload.data_path, mime=True)

        fupload.write_meta()

    return _tus_response(204, upload_offset=upload_offset)  # type: ignore


def item_delete(fupload: FileUpload, request) -> Annotated[None, StatusCode(204)]:
    """Dispose uploaded file on server"""

    fupload.data_path.unlink()
    fupload.meta_path.unlink()

    return _tus_response(204)  # type: ignore


def _tus_resumable_header(request, *, require=False):
    tr = request.headers.get("Tus-Resumable")
    if tr is None and not require:
        return False
    elif tr == "1.0.0":
        return True
    else:
        raise exc.exception_response(412)


def _tus_response(status, location=None, upload_offset=None, upload_length=None):
    headers = {"Tus-Resumable": "1.0.0"}

    if location is not None:
        headers["Location"] = location
    if upload_offset is not None:
        headers["Upload-Offset"] = str(upload_offset)
    if upload_length is not None:
        headers["Upload-Length"] = str(upload_length)

    return Response(status=status, headers=headers)


def _tus_decode_upload_metadata(value):
    result = dict()
    if value is not None:
        kv = value.split(",")
        for kv in value.split(","):
            k, v = kv.strip().split(" ", 2)
            result[k] = b64decode(v).decode("utf-8")
    return result


def setup_pyramid(comp, config):
    tus_cors_headers = dict(
        request=(
            "Upload-Offset",
            "Upload-Length",
            "Upload-Defer-Length",
            "Upload-Metadata",
            "Tus-Resumable",
        ),
        response=("Location",),
    )

    # TODO: Remove legacy route: Formbuilder
    config.add_route(
        "file_upload.upload",
        "/api/component/file_upload/upload",
        deprecated=True,
        post=collection_post,
        put=collection_put,
    )

    config.add_route(
        "file_upload.collection",
        "/api/component/file_upload/",
        options=collection_options,
        post=collection_post,
        put=collection_put,
        cors_headers=tus_cors_headers,
    )

    config.add_route(
        "file_upload.item",
        "/api/component/file_upload/{id}",
        factory=FileUploadFactory(incomplete_ok=True),
        head=item_head_tus,
        get=item_get,
        patch=item_patch_tus,
        delete=item_delete,
        cors_headers=tus_cors_headers,
    )
