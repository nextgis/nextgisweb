# -*- coding: utf-8 -*-
from shutil import copyfileobj
from StringIO import StringIO

from PIL import Image
from pyramid.response import Response

from ..object_widget import ObjectWidget

from .models import FeaturePhoto


def setup_pyramid(comp, config):
    DBSession = comp.env.core.DBSession

    file_upload = comp.env.file_upload
    file_storage = comp.env.file_storage

    class FeaturePhotoEditWidget(ObjectWidget):
        identity = 'feature_photo'

        # Слой, к которому привязан виджет. Должен быть
        # переопределен в дочернем классе
        layer = None

        def populate_obj(self):
            keep = []       # id НЕ удаленных фотографий
            new = []        # новые фотографии

            for photo in self.data:
                if 'upload' in photo:
                    # Это новый загруженный файл
                    datafile, metafile = file_upload.get_filename(photo['upload'])
                    fileobj = file_storage.fileobj(component='feature_photo')
                    targetfile = file_storage.filename(fileobj, makedirs=True)

                    with open(datafile, 'r') as fs, open(targetfile, 'w') as fd:
                        copyfileobj(fs, fd)

                    obj = FeaturePhoto(
                        layer_id=self.layer.id,
                        feature_id=self.obj.id,
                        fileobj=fileobj
                    )

                    # Собираем новые фотографии в список
                    new.append(obj)

                else:
                    # Это существующий файл, который не удалили
                    keep.append(photo['id'])

            # Выбираем все файлы для удаления
            query = FeaturePhoto.query() \
                .filter_by(layer_id=self.layer.id, feature_id=self.obj.id) \
                .filter(~FeaturePhoto.id.in_(keep))

            # Удаляем по одному
            for photo in query:
                DBSession.delete(photo)

            # Добавляем новые после удаления
            for obj in new:
                DBSession.add(obj)

        def widget_module(self):
            return 'feature_photo/Widget'

        def widget_params(self):
            result = super(FeaturePhotoEditWidget, self).widget_params()

            result['layer'] = self.layer.id

            if self.obj:
                query = DBSession.query(FeaturePhoto) \
                    .filter_by(layer_id=self.layer.id, feature_id=self.obj.id)
                result['value'] = [dict(id=photo.id) for photo in query]
                result['feature'] = self.obj.id

            return result

    comp.FeaturePhotoEditWidget = FeaturePhotoEditWidget

    def image(request):
        photo = DBSession.query(FeaturePhoto) \
            .filter_by(**request.matchdict) \
            .one()
        filename = comp.env.file_storage.filename(photo.fileobj)

        image = Image.open(filename)

        # Нужна картинка определенного размера или превью
        if 'size' in request.GET:
            image.thumbnail(
                map(int, request.GET['size'].split('x')),
                Image.ANTIALIAS
            )

        buf = StringIO()
        image.save(buf, 'jpeg')
        buf.seek(0)

        return Response(body_file=buf, content_type="image/jpeg")

    config.add_route('feature_photo.image', '/layer/{layer_id:\d+}/feature/{feature_id:\d+}/photo/{id:\d+}') \
        .add_view(image)
