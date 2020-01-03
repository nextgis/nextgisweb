# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..feature_layer import FeatureExtension
from ..models import DBSession
from .model import FeatureAttachment


@FeatureExtension.registry.register
class FeatureAttachmentExtension(FeatureExtension):
    identity = 'attachment'

    editor_widget = "ngw-feature-attachment/EditorWidget"
    display_widget = "ngw-feature-attachment/DisplayWidget"

    def serialize(self, feature):
        query = FeatureAttachment.filter_by(
            resource_id=self.layer.id,
            feature_id=feature.id)

        result = list(map(lambda itm: itm.serialize(), query))
        return result if len(result) > 0 else None

    def deserialize(self, feature, data):
        if data is None:
            data = []

        rest = dict()
        for fa in FeatureAttachment.filter_by(
            resource_id=feature.layer.id,
            feature_id=feature.id
        ):
            rest[fa.id] = fa

        for itm in data:
            if 'id' in itm:
                obj = rest[itm['id']]
                del rest[itm['id']]

            else:
                obj = FeatureAttachment(
                    resource_id=feature.layer.id,
                    feature_id=feature.id
                ).persist()

            obj.deserialize(itm)

        for fa in rest.values():
            DBSession.delete(fa)
