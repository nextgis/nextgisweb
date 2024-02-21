import re
from io import BytesIO
from itertools import count
from tempfile import NamedTemporaryFile
from urllib.parse import quote_plus
from zipfile import ZIP_DEFLATED, ZipFile

from msgspec import Meta
from PIL import Image
from pyramid.response import FileResponse, Response
from typing_extensions import Annotated

from nextgisweb.env import DBSession
from nextgisweb.lib.json import dumpb

from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.feature_layer.api import FeatureID
from nextgisweb.feature_layer.exception import FeatureNotFound
from nextgisweb.file_upload import FileUpload
from nextgisweb.pyramid import JSONType
from nextgisweb.pyramid.tomb import UnsafeFileResponse
from nextgisweb.resource import DataScope, ResourceFactory

from .exception import AttachmentNotFound
from .exif import EXIF_ORIENTATION_TAG, ORIENTATIONS
from .model import FeatureAttachment
from .util import attachments_import

AttachmentID = Annotated[int, Meta(ge=1, description="Attachment ID")]


def attachment_or_not_found(resource_id, feature_id, attachment_id):
    """Return attachment filtered by id or raise AttachmentNotFound exception."""

    obj = FeatureAttachment.filter_by(
        id=attachment_id,
        resource_id=resource_id,
        feature_id=feature_id,
    ).one_or_none()

    if obj is None:
        raise AttachmentNotFound(resource_id, feature_id, attachment_id)

    return obj


def download(resource, request):
    request.resource_permission(DataScope.read)

    obj = attachment_or_not_found(
        resource_id=resource.id,
        feature_id=int(request.matchdict["fid"]),
        attachment_id=int(request.matchdict["aid"]),
    )

    fn = obj.fileobj.filename()
    response = UnsafeFileResponse(str(fn), content_type=obj.mime_type, request=request)
    response.content_disposition = f"filename*=utf-8''{quote_plus(obj.name)}"
    return response


def image(resource, request):
    request.resource_permission(DataScope.read)

    obj = attachment_or_not_found(
        resource_id=resource.id,
        feature_id=int(request.matchdict["fid"]),
        attachment_id=int(request.matchdict["aid"]),
    )

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


def iget(resource, request) -> JSONType:
    request.resource_permission(DataScope.read)

    obj = attachment_or_not_found(
        resource_id=resource.id,
        feature_id=int(request.matchdict["fid"]),
        attachment_id=int(request.matchdict["aid"]),
    )

    return obj.serialize()


def idelete(resource, request) -> JSONType:
    request.resource_permission(DataScope.read)

    obj = attachment_or_not_found(
        resource_id=resource.id,
        feature_id=int(request.matchdict["fid"]),
        attachment_id=int(request.matchdict["aid"]),
    )

    DBSession.delete(obj)


def iput(resource, request) -> JSONType:
    request.resource_permission(DataScope.write)

    obj = attachment_or_not_found(
        resource_id=resource.id,
        feature_id=int(request.matchdict["fid"]),
        attachment_id=int(request.matchdict["aid"]),
    )

    obj.deserialize(request.json_body)

    DBSession.flush()

    return dict(id=obj.id)


def cget(resource, request) -> JSONType:
    request.resource_permission(DataScope.read)

    query = FeatureAttachment.filter_by(
        feature_id=request.matchdict["fid"], resource_id=resource.id
    )

    result = [itm.serialize() for itm in query]

    return result


def cpost(resource, request) -> JSONType:
    request.resource_permission(DataScope.write)

    feature_id = int(request.matchdict["fid"])
    query = resource.feature_query()
    query.filter_by(id=feature_id)
    query.limit(1)

    feature = None
    for f in query():
        feature = f

    if feature is None:
        raise FeatureNotFound(resource.id, feature_id)

    obj = FeatureAttachment(resource_id=feature.layer.id, feature_id=feature.id)
    obj.deserialize(request.json_body)

    DBSession.add(obj)
    DBSession.flush()

    return dict(id=obj.id)


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
                    name = f"{att_idx:010d}"

                if name in feature_anames:
                    # Make attachment's name unique
                    (base, suffix) = re.match(
                        r"(.*?)((?:\.[a-z0-9_]+)+)$", name, re.IGNORECASE
                    ).groups()
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
