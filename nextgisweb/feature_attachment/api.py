import re
from io import BytesIO
from itertools import count
from mimetypes import guess_extension
from tempfile import NamedTemporaryFile
from typing import Annotated, List, Optional
from urllib.parse import quote_plus
from zipfile import ZIP_DEFLATED, ZipFile

from msgspec import Meta, Struct
from PIL import Image
from pyramid.response import FileResponse, Response
from sqlalchemy.sql import select

from nextgisweb.env import DBSession
from nextgisweb.lib.apitype import ContentType
from nextgisweb.lib.json import dumpb

from nextgisweb.core.exception import ValidationError
from nextgisweb.feature_layer import IFeatureLayer, IVersionableFeatureLayer
from nextgisweb.feature_layer.api import FeatureID, query_feature_or_not_found, versioning
from nextgisweb.file_storage import FileObj
from nextgisweb.file_upload import FileUpload
from nextgisweb.pyramid import JSONType
from nextgisweb.pyramid.tomb import UnsafeFileResponse
from nextgisweb.resource import DataScope, Resource, ResourceFactory

from .api_import import attachments_import
from .exception import AttachmentNotFound
from .exif import EXIF_ORIENTATION_TAG, ORIENTATIONS
from .model import FeatureAttachment

ResourceID = Annotated[int, Meta(ge=0, description="Resource ID")]
AttachmentID = Annotated[int, Meta(description="Attachment ID")]


def attachment_or_not_found(resource, feature_id, attachment_id):
    """Return attachment filtered by id or raise AttachmentNotFound exception."""

    obj = FeatureAttachment.filter_by(
        id=attachment_id,
        resource_id=resource.id,
        feature_id=feature_id,
    ).one_or_none()

    if obj is None:
        raise AttachmentNotFound(resource.id, feature_id, attachment_id)

    return obj


def download(
    resource,
    request,
    fid: FeatureID,
    aid: AttachmentID,
    *,
    fileobj: Optional[int] = None,
):
    request.resource_permission(DataScope.read)

    fileobj_id, mime_type, name = None, None, None
    search_tables = [FeatureAttachment.__table__]
    if IVersionableFeatureLayer.providedBy(resource) and resource.fversioning:
        search_tables.append(FeatureAttachment.fversioning_htab)

    for tab in search_tables:
        query = select(tab.c.fileobj_id, tab.c.mime_type, tab.c.name)
        query = query.where(
            tab.c.id == aid,
            tab.c.resource_id == resource.id,
            tab.c.feature_id == fid,
        )
        if fileobj:
            query = query.where(tab.c.fileobj_id == fileobj)
        if row := DBSession.execute(query).first():
            fileobj_id, mime_type, name = row
            break
    else:
        raise AttachmentNotFound(resource.id, fid, aid)

    fobj = FileObj.filter_by(id=fileobj_id).one()
    response = UnsafeFileResponse(fobj.filename(), content_type=mime_type, request=request)
    if name is None:
        name = f"unnamed{aid}{guess_extension(mime_type) or '.bin'}"
    response.content_disposition = f"filename*=utf-8''{quote_plus(name)}"
    return response


def image(resource, request, fid: FeatureID, aid: AttachmentID):
    request.resource_permission(DataScope.read)

    obj = attachment_or_not_found(resource, fid, aid)
    image = Image.open(obj.fileobj.filename())
    ext = image.format

    exif = None
    try:
        exif = image._getexif()
    except Exception:
        pass

    if exif is not None:
        otag = exif.get(EXIF_ORIENTATION_TAG)
        if otag in (3, 6, 8):
            orientation = ORIENTATIONS.get(otag)
            image = image.transpose(orientation.degrees)

    if "size" in request.GET:
        image.thumbnail(list(map(int, request.GET["size"].split("x"))), Image.LANCZOS)

    buf = BytesIO()
    image.save(buf, ext)
    buf.seek(0)

    return Response(body_file=buf, content_type=obj.mime_type)


def iget(resource, request, fid: FeatureID, aid: AttachmentID) -> JSONType:
    request.resource_permission(DataScope.read)

    obj = attachment_or_not_found(resource, fid, aid)
    return obj.serialize()


def idelete(resource, request, fid: FeatureID, aid: AttachmentID) -> JSONType:
    request.resource_permission(DataScope.read)

    obj = attachment_or_not_found(resource, fid, aid)
    with versioning(resource, request):
        obj.delete()


def iput(resource, request, fid: FeatureID, aid: AttachmentID) -> JSONType:
    request.resource_permission(DataScope.write)

    obj = attachment_or_not_found(resource, fid, aid)
    with versioning(resource, request) as vobj:
        vinfo = dict(version=vobj.version_id) if vobj else dict()
        obj.deserialize(request.json_body)

    return dict(id=obj.id, **vinfo)


def cget(resource, request, fid: FeatureID) -> JSONType:
    request.resource_permission(DataScope.read)

    query = FeatureAttachment.filter_by(feature_id=fid, resource_id=resource.id)
    result = [itm.serialize() for itm in query]

    return result


def cpost(resource, request, fid: FeatureID) -> JSONType:
    request.resource_permission(DataScope.write)

    query_feature_or_not_found(resource.feature_query(), resource.id, fid)
    with versioning(resource, request) as vobj:
        vinfo = dict(version=vobj.version_id) if vobj else dict()
        obj = FeatureAttachment(resource=resource, feature_id=fid).persist()
        obj.deserialize(request.json_body)

    DBSession.flush()
    return dict(id=obj.id, **vinfo)


def export(resource, request):
    request.resource_permission(DataScope.read)

    query = FeatureAttachment.filter_by(resource_id=resource.id).order_by(
        FeatureAttachment.feature_id, FeatureAttachment.id
    )

    metadata = dict()
    metadata_items = metadata["items"] = dict()

    with NamedTemporaryFile(suffix=".zip") as tmp_file:
        with ZipFile(tmp_file, "w", ZIP_DEFLATED, allowZip64=True) as zipf:
            current_feature_id = None
            feature_anames = set()
            att_idx = 1

            for obj in query:
                if obj.feature_id != current_feature_id:
                    feature_anames.clear()
                    att_idx = 1
                    current_feature_id = obj.feature_id
                else:
                    att_idx += 1

                name = obj.name
                if name is None or name.strip() == "":
                    extension = guess_extension(obj.mime_type) or ".bin"
                    name = f"{att_idx:010d}{extension}"

                if name in feature_anames:
                    # Make attachment's name unique
                    (base, suffix) = re.match(
                        r"(.*?)((?:\.[a-z0-9_]+)+)?$", name, re.IGNORECASE
                    ).groups()
                    if suffix is None:
                        suffix = ""
                    for idx in count(1):
                        candidate = f"{base}.{idx}{suffix}"
                        if candidate not in feature_anames:
                            name = candidate
                            break

                feature_anames.add(name)
                arcname = f"{obj.feature_id:010d}/{name}"

                metadata_item = metadata_items[arcname] = dict(
                    id=obj.id, feature_id=obj.feature_id, name=obj.name, mime_type=obj.mime_type
                )
                if obj.keyname is not None:
                    metadata_item["keyname"] = obj.keyname
                if obj.description is not None:
                    metadata_item["description"] = obj.description

                zipf.write(obj.fileobj.filename(), arcname=arcname)

            zipf.writestr("metadata.json", dumpb(metadata))

        response = FileResponse(tmp_file.name, content_type="application/zip")
        response.content_disposition = 'attachment; filename="%d.attachments.zip"' % resource.id
        return response


def import_attachment(resource, request) -> JSONType:
    request.resource_permission(DataScope.write)

    data = request.json_body
    replace = data.get("replace", False) is True
    fupload = FileUpload(id=data["source"]["id"])
    return attachments_import(resource, fupload.data_path, replace=replace)


class BundleItem(Struct, kw_only=True):
    resource: ResourceID
    attachment: AttachmentID


class BundleBody(Struct, kw_only=True):
    items: List[BundleItem]


def bundle(request, body: BundleBody) -> Annotated[Response, ContentType("application/zip")]:
    """Download specific attachments as ZIP archive"""
    valid_rid = set()
    arc_names = set()
    re_idx = re.compile(r"^(.*?)((?:\.[a-z0-9]+)*)$", re.IGNORECASE)
    afiles = list()

    for itm in body.items:
        rid = itm.resource
        if rid not in valid_rid:
            if (resource := Resource.filter_by(id=rid).first()) is None:
                raise ValidationError
            if not IFeatureLayer.providedBy(resource):
                raise ValidationError
            request.resource_permission(DataScope.read, resource)
            valid_rid.add(rid)
        fa = FeatureAttachment.filter_by(id=itm.attachment, resource_id=rid).first()
        if fa is None:
            raise ValidationError

        arc_name = None
        for idx in count():
            if idx == 0:
                arc_name = fa.name
            else:
                arc_name = re_idx.sub(lambda m: f"{m.group(1)}-{idx}{m.group(2)}", fa.name)
            if arc_name not in arc_names:
                arc_names.add(arc_name)
                break

        assert arc_name is not None
        afiles.append((fa.fileobj.filename(), arc_name))

    with NamedTemporaryFile(suffix=".zip") as tmp_file:
        with ZipFile(tmp_file, "w", ZIP_DEFLATED, allowZip64=True) as zipf:
            for afile in afiles:
                zipf.write(*afile)

        response = FileResponse(tmp_file.name, content_type="application/zip")
        response.content_disposition = 'attachment; filename="bundle.zip"'
        return response


def setup_pyramid(comp, config):
    feature_layer_factory = ResourceFactory(context=IFeatureLayer)

    itmurl = "/api/resource/{id}/feature/{fid}/attachment/{aid}"
    colurl = "/api/resource/{id}/feature/{fid}/attachment/"

    config.add_route(
        "feature_attachment.download",
        itmurl + "/download",
        factory=feature_layer_factory,
        types=dict(fid=FeatureID, aid=AttachmentID),
        get=download,
    )

    config.add_route(
        "feature_attachment.image",
        itmurl + "/image",
        factory=feature_layer_factory,
        types=dict(fid=FeatureID, aid=AttachmentID),
        get=image,
    )

    config.add_route(
        "feature_attachment.item",
        itmurl,
        factory=feature_layer_factory,
        types=dict(fid=FeatureID, aid=AttachmentID),
        get=iget,
        put=iput,
        delete=idelete,
    )

    config.add_route(
        "feature_attachment.collection",
        colurl,
        factory=feature_layer_factory,
        types=dict(fid=FeatureID),
        get=cget,
        post=cpost,
    )

    config.add_route(
        "feature_attachment.export",
        "/api/resource/{id}/feature_attachment/export",
        factory=feature_layer_factory,
        get=export,
    )

    config.add_route(
        "feature_attachment.import",
        "/api/resource/{id}/feature_attachment/import",
        factory=feature_layer_factory,
        put=import_attachment,
    )

    config.add_route(
        "feature_attachment.bundle",
        "/api/component/feature_attachment/bundle",
        post=bundle,
    )
