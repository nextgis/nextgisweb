# -*- coding: utf-8 -*-
from ..component import Component, require

from .models import Base, FeatureDescription

__all__ = ['FeatureDescriptionComponent', 'FeatureDescription']


@Component.registry.register
class FeatureDescriptionComponent(Component):
    identity = 'feature_description'
    metadata = Base.metadata

    @require('feature_layer')
    def initialize(self):
        FeatureExtension = self.env.feature_layer.FeatureExtension

        @FeatureExtension.registry.register
        class FeatureDescriptionExtension(FeatureExtension):
            identity = 'feature_description'
            display_widget = 'feature_description/DisplayWidget'

            comp = self

            def feature_data(self, feature):
                DBSession = self.comp.env.core.DBSession
                obj = DBSession.query(FeatureDescription) \
                    .get((self.layer.id, feature.id))

                if obj:
                    return obj.value

            @property
            def feature_widget(self):
                class _Widget(self.comp.FeatureDescriptionEditWidget):
                    layer = self.layer

                return _Widget

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
