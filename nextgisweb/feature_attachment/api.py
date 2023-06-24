import filecmp
import re
from contextlib import contextmanager
from io import BytesIO
from itertools import count
from shutil import copyfileobj
from tempfile import NamedTemporaryFile
from urllib.parse import quote_plus
from zipfile import ZIP_DEFLATED, BadZipFile, ZipFile

from magic import from_buffer as magic_from_buffer
from PIL import Image
from pyramid.response import FileResponse, Response

from nextgisweb.env import DBSession, env
from nextgisweb.lib.json import dumpb, loadb

from nextgisweb.core.exception import ValidationError
from nextgisweb.feature_layer.exception import FeatureNotFound
from nextgisweb.pyramid import JSONType
from nextgisweb.resource import DataScope, resource_factory

from .exception import AttachmentNotFound
from .exif import EXIF_ORIENTATION_TAG, ORIENTATIONS
from .model import FeatureAttachment
from .util import COMP_ID, _


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
    response = FileResponse(fn, content_type=obj.mime_type, request=request)
    response.content_disposition = f'filename*=utf-8\'\'{quote_plus(obj.name)}'
    return response


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


def iget(resource, request) -> JSONType:
    request.resource_permission(DataScope.read)

    obj = attachment_or_not_found(
        resource_id=resource.id, feature_id=int(request.matchdict['fid']),
        attachment_id=int(request.matchdict['aid'])
    )

    return obj.serialize()


def idelete(resource, request) -> JSONType:
    request.resource_permission(DataScope.read)

    obj = attachment_or_not_found(
        resource_id=resource.id, feature_id=int(request.matchdict['fid']),
        attachment_id=int(request.matchdict['aid'])
    )

    DBSession.delete(obj)


def iput(resource, request) -> JSONType:
    request.resource_permission(DataScope.write)

    obj = attachment_or_not_found(
        resource_id=resource.id, feature_id=int(request.matchdict['fid']),
        attachment_id=int(request.matchdict['aid'])
    )

    obj.deserialize(request.json_body)

    DBSession.flush()

    return dict(id=obj.id)


def cget(resource, request) -> JSONType:
    request.resource_permission(DataScope.read)

    query = FeatureAttachment.filter_by(
        feature_id=request.matchdict['fid'],
        resource_id=resource.id)

    result = [itm.serialize() for itm in query]

    return result


def cpost(resource, request) -> JSONType:
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

    metadata = dict()
    metadata_items = metadata['items'] = dict()

    with NamedTemporaryFile(suffix=".zip") as tmp_file:
        with ZipFile(tmp_file, "w", ZIP_DEFLATED, allowZip64=True) as zipf:
            current_feature_id = None
            feature_anames = set()

            for obj in query:
                if obj.feature_id != current_feature_id:
                    feature_anames = set()
                    current_feature_id = obj.feature_id

                name = obj.name
                if name in feature_anames:
                    # Make attachment's name unique
                    (base, suffix) = re.match(
                        r'(.*?)((?:\.[a-z0-9_]+)+)$',
                        name, re.IGNORECASE).groups()
                    for idx in count(1):
                        candidate = f'{base}.{idx}{suffix}'
                        if candidate not in feature_anames:
                            name = candidate
                            break

                feature_anames.add(name)
                arcname = f'{obj.feature_id:010d}/{name}'

                metadata_item = metadata_items[arcname] = dict(
                    id=obj.id, feature_id=obj.feature_id,
                    name=obj.name, mime_type=obj.mime_type)
                if obj.description is not None:
                    metadata_item['description'] = obj.description

                fn = env.file_storage.filename(obj.fileobj)
                zipf.write(fn, arcname=arcname)

            zipf.writestr('metadata.json', dumpb(metadata))

        response = FileResponse(tmp_file.name, content_type='application/zip')
        response.content_disposition = 'attachment; filename="%d.attachments.zip"' % resource.id
        return response


def import_attachment(resource, request) -> JSONType:
    request.resource_permission(DataScope.write)

    data = request.json_body
    replace = data.get('replace', False) is True
    upload_meta = data['source']
    data, meta = request.env.file_upload.get_filename(upload_meta['id'])

    @contextmanager
    def open_zip_file():
        try:
            with ZipFile(data, mode='r') as zf:
                yield zf
        except BadZipFile:
            raise ValidationError(message=_("Invalid ZIP archive."))

    with open_zip_file() as z:
        try:
            metadata_info = z.getinfo('metadata.json')
        except KeyError:
            metadata_info = None

        if metadata_info is not None:
            metadata = loadb(z.read(metadata_info))
            metadata_items = metadata.get('items')
        else:
            metadata = None
            metadata_items = None

        sources = []

        for info in z.infolist():
            if info.is_dir() or info == metadata_info:
                continue

            info_fn = info.filename
            src = dict(info=info)

            if metadata_items is not None:
                try:
                    file_md = metadata_items.pop(info_fn)
                except KeyError:
                    raise ValidationError(message=_(
                        "File '{}' isn't found in metadata.").format(info_fn))

                file_name = file_md.get('name')
                if not isinstance(file_name, str):
                    raise ValidationError(message=_(
                        "Invalid name for file '{}'.").format(info_fn))
                src['name'] = file_name

                file_fid = file_md.get('feature_id')
                if not isinstance(file_fid, int):
                    raise ValidationError(message=_(
                        "Invalid feature ID for file '{}'.").format(info_fn))
                src['feature_id'] = file_fid

                file_mime = file_md.get('mime_type')
                if file_mime is not None and not isinstance(file_mime, str):
                    raise ValidationError(message=_(
                        "Invalid MIME type for file '{}'.").format(info_fn))
                src['mime_type'] = file_mime

                file_desc = file_md.get('description')
                if file_desc is not None and not isinstance(file_desc, str):
                    raise ValidationError(message=_(
                        "Invalid description for file '{}'.").format(info_fn))
                src['description'] = file_desc

            else:
                try:
                    file_fid, file_name = info.filename.split('/', 2)
                    if file_fid.isdigit():
                        file_fid = int(file_fid)
                    else:
                        raise ValueError
                except ValueError:
                    raise ValidationError(message=_(
                        "Could not determine feature ID for file '{}'."
                    ).format(info_fn))

                src['feature_id'] = file_fid
                src['name'] = file_name
                src['mime_type'] = None
                src['description'] = None

            if src['mime_type'] is None:
                with z.open(info) as f:
                    src['mime_type'] = magic_from_buffer(f.read(1024), mime=True)

            sources.append(src)

        if metadata_items is not None:
            for missing in metadata_items.keys():
                raise ValidationError(message=_(
                    "File '{}' isn't found in the archive.").format(missing))

        imported = 0
        skipped = 0

        if replace:
            FeatureAttachment.filter_by(resource_id=resource.id).delete()
            DBSession.flush()

        with DBSession.no_autoflush:
            for src in sources:
                fileobj = env.file_storage.fileobj(component=COMP_ID)
                dstfile = env.file_storage.filename(fileobj, makedirs=True)
                with z.open(src['info'], 'r') as sf, open(dstfile, 'wb') as df:
                    copyfileobj(sf, df)

                skip = False
                if not replace:
                    for att_cmp in FeatureAttachment.filter_by(
                        resource_id=resource.id,
                        feature_id=src['feature_id'],
                        size=src['info'].file_size
                    ):
                        cmpfile = env.file_storage.filename(
                            att_cmp.fileobj, makedirs=False)
                        if filecmp.cmp(dstfile, cmpfile, False):
                            skip = True
                            break

                if not skip:
                    obj = FeatureAttachment(
                        resource=resource,
                        feature_id=src['feature_id'],
                        name=src['name'],
                        mime_type=src['mime_type'],
                        description=src['description'],
                        size=src['info'].file_size,
                    ).persist()
                    obj.fileobj = fileobj.persist()
                    imported += 1
                else:
                    skipped += 1

        return dict(imported=imported, skipped=skipped)


def setup_pyramid(comp, config):
    colurl = '/api/resource/{id}/feature/{fid}/attachment/'
    itmurl = '/api/resource/{id}/feature/{fid}/attachment/{aid}'

    config.add_route(
        'feature_attachment.download',
        itmurl + '/download',
        factory=resource_factory,
    ).add_view(download)

    config.add_route(
        'feature_attachment.image',
        itmurl + '/image',
        factory=resource_factory,
    ).add_view(image)

    config.add_route(
        'feature_attachment.item', itmurl,
        factory=resource_factory) \
        .add_view(iget, request_method='GET') \
        .add_view(iput, request_method='PUT') \
        .add_view(idelete, request_method='DELETE')

    config.add_route(
        'feature_attachment.collection', colurl,
        factory=resource_factory) \
        .add_view(cget, request_method='GET') \
        .add_view(cpost, request_method='POST')

    config.add_route(
        'feature_attachment.export',
        '/api/resource/{id}/feature_attachment/export',
        factory=resource_factory
    ).add_view(export)

    config.add_route(
        'feature_attachment.import',
        '/api/resource/{id}/feature_attachment/import',
        factory=resource_factory
    ).add_view(import_attachment, request_method='PUT')
