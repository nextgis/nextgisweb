# -*- coding: utf-8 -*-
from ..component import Component


@Component.registry.register
class FileUploadComponent(object):

    @classmethod
    def setup_routes(cls, config):
        config.add_route('file_upload.test', '/file_upload/test')
        config.add_route('file_upload.upload', '/file_upload/upload')
