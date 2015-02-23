# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from ..feature_layer import FeatureExtension
from ..models import DBSession

from .model import FeatureDescription


@FeatureExtension.registry.register
class FeatureDescriptionExtension(FeatureExtension):
    identity = 'description'

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
