from io import BytesIO
from zipfile import ZipFile, ZIP_DEFLATED
from tempfile import NamedTemporaryFile

from PIL import Image
from pyramid.response import Response, FileResponse

from ..resource import DataScope, resource_factory
from ..env import env
from ..models import DBSession
from ..feature_layer.exception import FeatureNotFound

from .exception import AttachmentNotFound
from .exif import EXIF_ORIENTATION_TAG, ORIENTATIONS
from .model import FeatureAttachment


def attachment_or_not_found(resource_id, feature_id, attachment_id):
    """ Return attachment filtered by id or raise AttachmentNotFound exception. """

    obj = FeatureAttachment.filter_by(
        id=attachment_id, resource_id=resource_id,
        feature_id=feature_id
    ).one_or_none()

    if obj is None:
        raise AttachmentNotFound(resource_id, feature_id, attachment_id)

    return obj


def download(resource, request):
    request.resource_permission(DataScope.read)

    obj = attachment_or_not_found(
        resource_id=resource.id, feature_id=int(request.matchdict['fid']),
        attachment_id=int(request.matchdict['aid'])
    )

    fn = env.file_storage.filename(obj.fileobj)
    return FileResponse(fn, content_type=obj.mime_type, request=request)


def image(resource, request):
    request.resource_permission(DataScope.read)

    obj = attachment_or_not_found(
        resource_id=resource.id, feature_id=int(request.matchdict['fid']),
        attachment_id=int(request.matchdict['aid'])
    )

    image = Image.open(env.file_storage.filename(obj.fileobj))
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

    if 'size' in request.GET:
        image.thumbnail(
            list(map(int, request.GET['size'].split('x'))),
            Image.ANTIALIAS)

    buf = BytesIO()
    image.save(buf, ext)
    buf.seek(0)

    return Response(body_file=buf, content_type=obj.mime_type)


def iget(resource, request):
    request.resource_permission(DataScope.read)

    obj = attachment_or_not_found(
        resource_id=resource.id, feature_id=int(request.matchdict['fid']),
        attachment_id=int(request.matchdict['aid'])
    )

    return obj.serialize()


def idelete(resource, request):
    request.resource_permission(DataScope.read)

    obj = attachment_or_not_found(
        resource_id=resource.id, feature_id=int(request.matchdict['fid']),
        attachment_id=int(request.matchdict['aid'])
    )

    DBSession.delete(obj)


def iput(resource, request):
    request.resource_permission(DataScope.write)

    obj = attachment_or_not_found(
        resource_id=resource.id, feature_id=int(request.matchdict['fid']),
        attachment_id=int(request.matchdict['aid'])
    )

    obj.deserialize(request.json_body)

    DBSession.flush()

    return dict(id=obj.id)


def cget(resource, request):
    request.resource_permission(DataScope.read)

    query = FeatureAttachment.filter_by(
        feature_id=request.matchdict['fid'],
        resource_id=resource.id)

    result = [itm.serialize() for itm in query]

    return result


def cpost(resource, request):
    request.resource_permission(DataScope.write)

    feature_id = int(request.matchdict['fid'])
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

    query = FeatureAttachment.filter_by(resource_id=resource.id) \
        .order_by(FeatureAttachment.feature_id, FeatureAttachment.id)

    with NamedTemporaryFile(suffix=".zip") as tmp_file:
        with ZipFile(tmp_file, "w", ZIP_DEFLATED, allowZip64=True) as zipf:
            for obj in query:
                fn = env.file_storage.filename(obj.fileobj)
                arcname = f'{obj.feature_id:010d}/{obj.id:010d}-{obj.name}'
                zipf.write(fn, arcname=arcname)

        response = FileResponse(tmp_file.name, content_type='application/zip')
        response.content_disposition = 'attachment; filename="%d.attachments.zip"' % resource.id
        return response


def setup_pyramid(comp, config):
    colurl = '/api/resource/{id}/feature/{fid}/attachment/'
    itmurl = '/api/resource/{id}/feature/{fid}/attachment/{aid}'

    config.add_route(
        'feature_attachment.download',
        itmurl + '/download',
        factory=resource_factory) \
        .add_view(download)

    config.add_route(
        'feature_attachment.image',
        itmurl + '/image',
        factory=resource_factory) \
        .add_view(image)

    config.add_route(
        'feature_attachment.item', itmurl,
        factory=resource_factory) \
        .add_view(iget, request_method='GET', renderer='json') \
        .add_view(iput, request_method='PUT', renderer='json') \
        .add_view(idelete, request_method='DELETE', renderer='json')

    config.add_route(
        'feature_attachment.collection', colurl,
        factory=resource_factory) \
        .add_view(cget, request_method='GET', renderer='json') \
        .add_view(cpost, request_method='POST', renderer='json')

    config.add_route(
        'feature_attachment.export',
        '/api/resource/{id}/feature_attachment/export',
        factory=resource_factory
    ).add_view(export)