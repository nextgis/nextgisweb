import filecmp
import os
import re
from io import BytesIO
from itertools import count
from pathlib import Path
from shutil import copyfileobj
from tempfile import NamedTemporaryFile
from zipfile import ZipFile, ZIP_DEFLATED

import magic
from PIL import Image
from pyramid.response import Response, FileResponse

from ..core.exception import ValidationError
from ..lib.json import dumpb, loadb
from ..resource import DataScope, resource_factory
from ..env import env
from ..models import DBSession
from ..feature_layer.exception import FeatureNotFound

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


def import_attachment(resource, request):
    request.resource_permission(DataScope.write)
    tr = request.localizer.translate

    data = request.json_body

    clear = data.get('clear', False)
    if clear:
        FeatureAttachment.filter_by(resource_id=resource.id).delete()

    upload_meta = data['source']
    data, meta = request.env.file_upload.get_filename(upload_meta['id'])
    with DBSession.no_autoflush, ZipFile(data, mode='r') as z:
        meta_file = 'metadata.json'

        imported = 0
        skipped = 0

        def create(info, feature_id):
            fileobj = env.file_storage.fileobj(component=COMP_ID)
            dstfile = env.file_storage.filename(fileobj, makedirs=True)
            with z.open(info, 'r') as sf, open(dstfile, 'wb') as df:
                copyfileobj(sf, df)

            if not clear:
                for att_cmp in FeatureAttachment.filter_by(
                    resource_id=resource.id,
                    feature_id=feature_id,
                    size=info.file_size
                ):
                    cmpfile = env.file_storage.filename(att_cmp.fileobj, makedirs=False)
                    if filecmp.cmp(dstfile, cmpfile, False):
                        return None

            obj = FeatureAttachment(
                resource=resource,
                feature_id=feature_id,
                size=info.file_size,
            ).persist()
            obj.fileobj = fileobj.persist()

            return obj

        meta = None
        infolist = []
        for info in z.infolist():
            if info.is_dir():
                continue
            if info.filename == meta_file:
                meta = loadb(z.read(meta_file))
            else:
                infolist.append(info)

        if meta is not None:
            str_limit = 500

            def file_list_msg(files, limit):
                join = ", "
                msg = ""
                for name in files:
                    name = f"'{name}'"
                    if msg != "":
                        name = join + name
                    limit -= len(name)
                    if limit <= 0:
                        msg += _("... ({} files).".format(len(files)))
                        return msg
                    msg += name
                return msg + "."

            cmp_A = set(meta['items'].keys())
            cmp_B = set(info.filename for info in infolist)
            if len((excess_items := (cmp_A - cmp_B))) > 0:
                msg = tr(
                    _("Following files found in {}, but missing from the archive: ")
                    .format(meta_file))
                raise ValidationError(msg + file_list_msg(excess_items, str_limit - len(msg)))
            elif len((excess_files := (cmp_B - cmp_A))) > 0:
                msg = tr(
                    _("Following files found in archive, but missing in {}: ")
                    .format(meta_file))
                raise ValidationError(msg + file_list_msg(excess_files, str_limit - len(msg)))

        for info in infolist:
            if meta is None:
                path = Path(info.filename)
                if not (len(path.parts) > 1 and path.parts[0].isdigit()):
                    raise ValidationError(
                        _("Could not determine feature ID from path '{}'.").format(info.filename))
                feature_id = int(path.parts[0])
            else:
                item_meta = meta['items'][info.filename]
                feature_id = item_meta['feature_id']

            obj = create(info, feature_id)
            if obj is None:
                skipped += 1
                continue
            imported += 1

            if meta is None:
                obj.name = os.path.join(*path.parts[1:])
                with z.open(info) as f:
                    obj.mime_type = magic.from_buffer(f.read(1024), mime=True)
            else:
                for k in ('name', 'mime_type', 'description'):
                    setattr(obj, k, item_meta.get(k))

    return dict(imported=imported, skipped=skipped)


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

    config.add_route(
        'feature_attachment.import',
        '/api/resource/{id}/feature_attachment/import',
        factory=resource_factory
    ).add_view(import_attachment, request_method='PUT', renderer='json')
