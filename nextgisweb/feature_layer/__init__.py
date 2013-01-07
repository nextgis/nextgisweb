# -*- coding: utf-8 -*-
from ..component import Component

from .feature import Feature, FeatureSet
from .models import LayerField, LayerFieldsMixin
from .interface import (
    GEOM_TYPE,
    FIELD_TYPE,
    IFeatureLayer,
    IFeatureQuery,
    IFeatureQueryFilterBy,
    IFeatureQueryOrderBy,
)


@Component.registry.register
class FeatureLayerComponent(Component):
    identity = 'feature_layer'

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
