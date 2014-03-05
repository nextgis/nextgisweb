# -*- coding: utf-8 -*-
from ..component import Component, require

from .feature import Feature, FeatureSet
from .model import Base, LayerField, LayerFieldsMixin
from .interface import (
    GEOM_TYPE,
    FIELD_TYPE,
    IFeatureLayer,
    IWritableFeatureLayer,
    IFeatureQuery,
    IFeatureQueryFilterBy,
    IFeatureQueryOrderBy,
    IFeatureQueryLike,
)


@Component.registry.register
class FeatureLayerComponent(Component):
    identity = 'feature_layer'
    metadata = Base.metadata

    def initialize(self):
        self.settings['identify.attributes'] = \
            self.settings.get('identify.attributes', 'true').lower() == 'true'

        from .extension import FeatureExtension
        self.FeatureExtension = FeatureExtension

    @require('resource')
    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)

    settings_info = (
        dict(key='identify.attributes', desc=u"Показывать атрибуты в идентификации"),
    )
