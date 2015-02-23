# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from ..component import Component, require

from .model import Base, FeatureDescription

__all__ = ['FeatureDescriptionComponent', 'FeatureDescription']


@Component.registry.register
class FeatureDescriptionComponent(Component):
    identity = 'feature_description'
    metadata = Base.metadata

    @require('feature_layer')
    def initialize(self):
        from . import extension # NOQA

        # FeatureExtension = self.env.feature_layer.FeatureExtension

        # @FeatureExtension.registry.register
        # class FeatureDescriptionExtension(FeatureExtension):
        #     identity = 'feature_description'
        #     display_widget = 'feature_description/DisplayWidget'

        #     comp = self

        #     def feature_data(self, feature):
        #         obj = FeatureDescription.filter_by(
        #             layer_id=self.layer.id,
        #             feature_id=feature.id,
        #         ).first()

        #         if obj:
        #             return obj.value

        #     @property
        #     def feature_widget(self):
        #         class _Widget(self.comp.FeatureDescriptionEditWidget):
        #             layer = self.layer
        #         return _Widget

    # def setup_pyramid(self, config):
    #     from . import view
    #     view.setup_pyramid(self, config)
