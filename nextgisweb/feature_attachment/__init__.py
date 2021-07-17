# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..component import Component, require
from ..core import KindOfData

from .model import Base, FeatureAttachment
from .util import _

__all__ = ['FeatureAttachmentComponent', ]


class FeatureAttachmentData(KindOfData):
    identity = 'feature_attachment'
    display_name = _("Feature attachments")


class FeatureAttachmentComponent(Component):
    identity = 'feature_attachment'
    metadata = Base.metadata

    @require('feature_layer')
    def initialize(self):
        from . import extension # NOQA

    def setup_pyramid(self, config):
        from . import api
        api.setup_pyramid(self, config)

    def estimate_storage(self):
        for obj in FeatureAttachment.query():
            yield FeatureAttachmentData, obj.resource_id, obj.size
