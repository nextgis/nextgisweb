import pickle
import re
from base64 import b64decode
from os import unlink
from os.path import isfile
from shutil import copyfileobj
from typing import List, Union

import magic
import pyramid.httpexceptions as exc
from msgspec import UNSET, Meta, Struct, UnsetType
from pyramid.response import Response
from typing_extensions import Annotated

from nextgisweb.env import env, gettext, inject
from nextgisweb.lib.apitype import AnyOf, AsJSON, StatusCode, struct_items

from nextgisweb.core.exception import UserException

from .component import FileUploadComponent

BUF_SIZE = 1024 * 1024


class UploadedFileTooLarge(UserException):
    title = gettext("Uploaded file too large")
    http_status_code = 413


class UploadNotCompleted(UserException):
    title = gettext("Upload is not completed")
    http_status_code = 405


FileID = Annotated[
    str,
    Meta(
        pattern="^([0-9a-f][0-9a-f]){16}$",
        description="File upload ID",
        extra=dict(route_pattern=r"([0-9a-f][0-9a-f]){16}"),
    ),
]


class FileUploadObject(Struct, kw_only=True):
    id: FileID
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
    request, *, comp: FileUploadComponent
) -> AsJSON[Annotated[FileUploadObject, StatusCode(201)],]:
    """Upload small file via request body

    :returns: Uploaded file metadata"""
    request.env.core.check_storage_limit()

    comp = env.file_upload
    if request.content_length > comp.max_size:
        raise UploadedFileTooLarge()

    fileid = comp.fileid()
    datafn, metafn = comp.get_filename(fileid, makedirs=True)

    with open(datafn, "wb") as fd:
        copyfileobj(request.body_file, fd, length=BUF_SIZE)
        size = fd.tell()

    result = FileUploadObject(id=fileid, size=size)

    cntdisp = request.headers.get("Content-Disposition")
    if cntdisp:
        match = re.match(r'^.*filename="{0,1}(.*?)"{0,1}$', cntdisp)
        if match:
            result.name = match.group(1)

    # If MIME-type was not declared on upload, define independently by running
    # file. Standard mimetypes package does it only using extension but we don't
    # always know filename.

    mime_type = request.headers.get("Content-Type")
    if (not mime_type or mime_type == "application/x-www-form-urlencoded") and size > 0:
        mime_type = magic.from_file(datafn, mime=True)

    if mime_type:
        result.mime_type = mime_type

    with open(metafn, "wb") as fd:
        meta = {k: v for k, v in struct_items(result)}
        fd.write(pickle.dumps(meta))

    request.response.status = 201
    return result


class FileUploadFormPost(Struct, kw_only=True):
    upload_meta: List[FileUploadObject]


def collection_post(
    request,
) -> AnyOf[Annotated[FileUploadFormPost, StatusCode(200)], Annotated[None, StatusCode(201)],]:
    """Upload one or more small files or start new TUS upload

    Small files can be encoded as `multipart/form-data`. For TUS uploads, refer
    to [the specification](https://tus.io/protocols/resumable-upload#post) for
    additional details."""
    request.env.core.check_storage_limit()

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

        meta = dict(
            mime_type=ufile.type,
            name=ufile.filename,
            size=size,
        )

        fileid = comp.fileid()
        meta["id"] = fileid

        fn_data, fn_meta = comp.get_filename(fileid, makedirs=True)

        with open(fn_data, "wb") as fd:
            copyfileobj(ufile.file, fd, length=BUF_SIZE)

        with open(fn_meta, "wb") as fm:
            fm.write(pickle.dumps(meta))

        upload_meta.append(FileUploadObject(**meta))

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

    fid = comp.fileid()
    fnd, fnm = comp.get_filename(fid, makedirs=True)

    # Just touch the data file
    with open(fnd, "wb") as fd:
        pass

    meta = dict(id=fid, size=upload_length, incomplete=True)

    # Copy name and mime_type from upload metadata
    for k in ("name", "mime_type"):
        v = upload_metadata.get(k)
        if v is not None:
            meta[k] = v

    with open(fnm, "wb") as fd:
        fd.write(pickle.dumps(meta))

    return _tus_response(201, location=request.route_url("file_upload.item", id=fid))


@inject()
def item_head_tus(request, *, comp: FileUploadComponent) -> Annotated[None, StatusCode(200)]:
    """Read TUS upload metadata

    See [the specification](https://tus.io/protocols/resumable-upload#head)
    for additional details.

    :returns: No data"""
    _tus_resumable_header(request, require=True)

    fnd, fnm = comp.get_filename(request.matchdict["id"])

    if not isfile(fnd):
        raise exc.HTTPNotFound()

    with open(fnm, "rb") as fd:
        meta = pickle.loads(fd.read())

    with open(fnd, "ab") as fd:
        upload_offset = fd.tell()

    return _tus_response(  # type: ignore
        200,
        upload_offset=upload_offset,
        upload_length=meta.get("size"),
    )


def item_get(request) -> FileUploadObject:
    """Read metadata of uploaded file

    :returns: Uploaded file metadata"""
    fnd, fnm = request.env.file_upload.get_filename(request.matchdict["id"])

    if not isfile(fnm):
        raise exc.HTTPNotFound()

    with open(fnm, "rb") as fd:
        meta = pickle.loads(fd.read())

        # Don't return incomplete upload
        if meta.get("incomplete", False):
            raise UploadNotCompleted()

    return FileUploadObject(**meta)


@inject()
def item_patch_tus(request, *, comp: FileUploadComponent) -> Annotated[None, StatusCode(204)]:
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

    fnd, fnm = comp.get_filename(request.matchdict["id"])

    if not isfile(fnm):
        raise exc.HTTPNotFound()

    with open(fnm, "rb") as fd:
        meta = pickle.loads(fd.read())
        size = meta["size"]

    # Don't upload more than declared file size.
    if upload_offset + request.content_length > size:
        raise UploadedFileTooLarge()

    with open(fnd, "ab") as fd:
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
            if upload_offset + read > size:
                raise UploadedFileTooLarge()
            fd.write(buf)
            upload_offset += read

    if size == upload_offset:
        # File upload completed
        del meta["incomplete"]

        # Detect MIME-type
        if "mime_type" not in meta:
            meta["mime_type"] = magic.from_file(fnd, mime=True)

        # Save changes to metadata
        with open(fnm, "wb") as fd:
            fd.write(pickle.dumps(meta))

    return _tus_response(204, upload_offset=upload_offset)  # type: ignore


def item_delete(request) -> Annotated[None, StatusCode(204)]:
    """Dispose uploaded file on server"""
    fnd, fnm = request.env.file_upload.get_filename(request.matchdict["id"])
    if not isfile(fnm):
        raise exc.HTTPNotFound()

    unlink(fnd)
    unlink(fnm)

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
    # TODO: Remove legacy route: Formbuilder, Connect
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
    )

    config.add_route(
        "file_upload.item",
        "/api/component/file_upload/{id}",
        types=dict(id=FileID),
        head=item_head_tus,
        get=item_get,
        patch=item_patch_tus,
        delete=item_delete,
    )
