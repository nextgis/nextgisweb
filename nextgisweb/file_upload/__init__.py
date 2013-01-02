# -*- coding: utf-8 -*-
import os
import uuid

from ..component import Component

from .views import includeme


__all__ = ["FileUploadComponent", ]


@Component.registry.register
class FileUploadComponent(Component):
    identity = 'file_upload'

    def setup_pyramid(self, config):
        includeme(config, self, self._env)

    def fileid(self):
        """ Возвращает новый идентификатор файла """
        return str(uuid.uuid4())

    def get_filename(self, fileid, makedirs=False):
        """ Возвращает имена файлов (данные и метаданные), в котором
        хранится загружаемый файл с указанным fileid.

        При makedirs == True так же создаются необходимые директории.
        Полезно в случае, когда имена файлов нужны для записи. """

        assert ('path' in self.settings) and os.path.isdir(self.settings['path']), \
            "Invalid path setting!"

        base_path = self.settings['path']

        # разделяем на два уровня директорий по первым символам id
        levels = (fileid[0:2], fileid[2:4])
        level_path = os.path.join(base_path, *levels)

        # создаем директории если нужно
        if makedirs and not os.path.isdir(level_path):
            os.makedirs(level_path)

        base_filename = os.path.join(level_path, fileid)
        return (base_filename + '.data', base_filename + '.meta')

    settings_info = (
        dict(key='path', desc=u"Директория для временного хранения загруженных файлов"),
    )
