# -*- coding: utf-8 -*-
from ..component import Component, require


@Component.registry.register
class FeaturePhotoComponent(Component):
    identity = 'feature_photo'

    @require('feature_layer', 'file_storage')
    def initialize(self):
        from . import models
        models.initialize(self)

        FeatureExtension = self.env.feature_layer.FeatureExtension

        @FeatureExtension.registry.register
        class FeaturePhotoExtension(FeatureExtension):
            identity = 'feature_photo'
            comp = self

            @property
            def feature_widget(self):
                class _Widget(self.comp.FeaturePhotoEditWidget):
                    layer = self.layer

                return _Widget

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
