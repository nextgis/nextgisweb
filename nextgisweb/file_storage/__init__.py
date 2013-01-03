# -*- coding: utf-8 -*-
import os

from ..component import Component
from ..models import DBSession

from .models import FileObj


@Component.registry.register
class FileStorageComponent(Component):
    identity = 'file_storage'

    def fileobj(self, component):
        obj = FileObj(component=component)
        DBSession.add(obj)
        DBSession.flush((obj, ))
        return obj

    def filename(self, fileobj, makedirs=False):
        assert ('path' in self.settings) and (os.path.isdir(self.settings['path'])), "Path not set!"
        assert fileobj.component, "Component not set!"

        base_path = self.settings['path']

        path = os.path.join(base_path, fileobj.component)

        # создаем директории если нужно
        if makedirs and not os.path.isdir(path):
            os.makedirs(path)

        return os.path.join(path, str(fileobj.id))

    settings_info = (
        dict(key='path', desc=u"Директория для хранения файлов"),
    )
