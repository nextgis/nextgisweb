# -*- coding: utf-8 -*-
import os
import uuid

from ..component import Component
from . import command  # NOQA

__all__ = ["FileUploadComponent", ]


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
        """ Returns new file identifier """
        return str(uuid.uuid4())

    def get_filename(self, fileid, makedirs=False):
        """ Returns filename (data and metadata), where
        uploaded file is stored with set fileid.

        With makedirs == True also create folders.
        Useful when filename are needed for writing. """

        # Separate in two folder levels by first id characters
        levels = (fileid[0:2], fileid[2:4])
        level_path = os.path.join(self.path, *levels)

        # Create folders if needed
        if makedirs and not os.path.isdir(level_path):
            os.makedirs(level_path)

        base_filename = os.path.join(level_path, fileid)
        return (base_filename + '.data', base_filename + '.meta')

    settings_info = (
        dict(key='path', desc=u"Uploads storage folder (required)"),
    )
