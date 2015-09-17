# -*- coding: utf-8 -*-
import os
import uuid

from ..component import Component
from . import command  # NOQA

__all__ = ["FileUploadComponent", ]


@Component.registry.register
class FileUploadComponent(Component):
    identity = 'file_upload'

    def initialize(self):
        self.path = self.settings.get('path') or self.env.core.gtsdir(self)

    def initialize_db(self):
        if 'path' not in self.settings:
            self.env.core.mksdir(self)

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)

    def fileid(self):
        """ Возвращает новый идентификатор файла """
        return str(uuid.uuid4())

    def get_filename(self, fileid, makedirs=False):
        """ Возвращает имена файлов (данные и метаданные), в котором
        хранится загружаемый файл с указанным fileid.

        При makedirs == True так же создаются необходимые директории.
        Полезно в случае, когда имена файлов нужны для записи. """

        # Разделяем на два уровня директорий по первым символам id
        levels = (fileid[0:2], fileid[2:4])
        level_path = os.path.join(self.path, *levels)

        # Создаем директории если нужно
        if makedirs and not os.path.isdir(level_path):
            os.makedirs(level_path)

        base_filename = os.path.join(level_path, fileid)
        return (base_filename + '.data', base_filename + '.meta')

    settings_info = (
        dict(key='path', desc=u"Директория для временного хранения загруженных файлов (обязательно)"),
    )
