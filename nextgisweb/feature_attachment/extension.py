# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from ..feature_layer import FeatureExtension
from .model import FeatureAttachment


@FeatureExtension.registry.register
class FeatureAttachmentExtension(FeatureExtension):
    identity = 'attachment'

    def serialize(self, feature):
        query = FeatureAttachment.filter_by(
            resource_id=self.layer.id,
            feature_id=feature.id)

        result = map(lambda itm: itm.serialize(), query)
        return result if len(result) > 0 else None

    def deserialize(self, feature, data):
        if data is None:
            data = []

        for itm in data:
            FeatureAttachment.deserialize(feature, itm)
