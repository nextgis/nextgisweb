# -*- coding: utf-8 -*-
import os
import logging
from shutil import copyfileobj
from collections import OrderedDict, defaultdict

from ..component import Component
from ..core import BackupBase

from .models import Base, FileObj
from . import command  # NOQA

__all__ = ['FileStorageComponent', 'FileObj']

logger = logging.getLogger(__name__)


@BackupBase.registry.register
class FileObjBackup(BackupBase):
    identity = 'fileobj'

    def blob(self):
        return True

    def backup(self, dst):
        fileobj = FileObj.filter_by(uuid=self.data['uuid']).one()
        with open(self.component.filename(fileobj), 'rb') as fd:
            copyfileobj(fd, dst)

    def restore(self, src):
        fileobj = FileObj.filter_by(uuid=self.data['uuid']).one()
        fn = self.component.filename(fileobj, makedirs=True)
        if os.path.isfile(fn):
            logger.debug("Skipping restoration of fileobj %s: file already exists!", fileobj.uuid)
        else:
            with open(fn, 'wb') as fd:
                copyfileobj(src, fd)


class FileStorageComponent(Component):
    identity = 'file_storage'
    metadata = Base.metadata

    def initialize(self):
        self.path = self.settings.get('path') or self.env.core.gtsdir(self)

    def initialize_db(self):
        if 'path' not in self.settings:
            self.env.core.mksdir(self)

    def backup(self):
        for fileobj in FileObj.query():
            yield FileObjBackup(dict(uuid=fileobj.uuid))

    def fileobj(self, component):
        obj = FileObj(component=component)
        return obj

    def filename(self, fileobj, makedirs=False):
        assert fileobj.component, "Component not set!"

        # Separate in two folder levels by first id characters
        levels = (fileobj.uuid[0:2], fileobj.uuid[2:4])
        path = os.path.join(self.path, fileobj.component, *levels)

        # Create folders if needed
        if makedirs and not os.path.isdir(path):
            os.makedirs(path)

        return os.path.join(path, str(fileobj.uuid))

    def query_stat(self):
        # Traverse all objects in file storage and calculate total
        # and per component size in filesystem

        def itm():
            return OrderedDict(size=0, count=0)

        result = OrderedDict(
            total=itm(), component=defaultdict(itm))

        def add_item(itm, size):
            itm['size'] += size
            itm['count'] += 1

        for fileobj in FileObj.query():
            statres = os.stat(self.filename(fileobj))
            add_item(result['total'], statres.st_size)
            add_item(result['component'][fileobj.component], statres.st_size)

        return result

    settings_info = (
        dict(key='path', desc=u"Files storage folder (required)"),
    )
