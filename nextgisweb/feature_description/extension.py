# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..feature_layer import FeatureExtension
from ..models import DBSession

from .model import FeatureDescription


@FeatureExtension.registry.register
class FeatureDescriptionExtension(FeatureExtension):
    identity = 'description'

    editor_widget = 'ngw-feature-description/EditorWidget'
    display_widget = 'ngw-feature-description/DisplayWidget'

    def serialize(self, feature):
        obj = FeatureDescription.filter_by(
            resource_id=self.layer.id,
            feature_id=feature.id
        ).first()

        if obj is None:
            return None
        else:
            return obj.value

    def deserialize(self, feature, data):
        obj = FeatureDescription.filter_by(
            resource_id=self.layer.id,
            feature_id=feature.id
        ).first()

        if obj is None:
            if data is not None:
                obj = FeatureDescription(
                    resource_id=self.layer.id,
                    feature_id=feature.id,
                    value=data)
                obj.persist()

        else:
            if data is None:
                DBSession.delete(obj)
            else:
                obj.value = data
