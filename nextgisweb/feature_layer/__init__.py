# -*- coding: utf-8 -*-
from ..component import Component

from .feature import Feature, FeatureSet
from .models import LayerField, LayerFieldsMixin
from .interface import (
    GEOM_TYPE,
    FIELD_TYPE,
    IFeatureLayer,
    IWritableFeatureLayer,
    IFeatureQuery,
    IFeatureQueryFilterBy,
    IFeatureQueryOrderBy,
)


@Component.registry.register
class FeatureLayerComponent(Component):
    identity = 'feature_layer'

    def initialize(self):
        from .extension import FeatureExtension
        self.FeatureExtension = FeatureExtension

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
