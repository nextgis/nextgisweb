# -*- coding: utf-8 -*-
import os

from ..component import Component
from .models import Base, FileObj


@Component.registry.register
class FileStorageComponent(Component):
    identity = 'file_storage'

    def initialize(self):
        super(FileStorageComponent, self).initialize()
        self.metadata = Base.metadata
        self.FileObj = FileObj

    def fileobj(self, component):
        obj = FileObj(component=component)
        return obj

    def filename(self, fileobj, makedirs=False):
        assert ('path' in self.settings) and (os.path.isdir(self.settings['path'])), "Path not set!"
        assert fileobj.component, "Component not set!"

        base_path = self.settings['path']

        # разделяем на два уровня директорий по первым символам id
        levels = (fileobj.uuid[0:2], fileobj.uuid[2:4])
        path = os.path.join(base_path, fileobj.component, *levels)

        # создаем директории если нужно
        if makedirs and not os.path.isdir(path):
            os.makedirs(path)

        return os.path.join(path, str(fileobj.uuid))

    settings_info = (
        dict(key='path', desc=u"Директория для хранения файлов"),
    )
