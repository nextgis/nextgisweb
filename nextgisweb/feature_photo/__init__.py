# -*- coding: utf-8 -*-
from ..component import Component, require

from .models import Base, FeaturePhoto

__all__ = ['FeaturePhotoComponent', 'FeaturePhoto']


@Component.registry.register
class FeaturePhotoComponent(Component):
    identity = 'feature_photo'
    metadata = Base.metadata

    @require('feature_layer', 'file_storage')
    def initialize(self):
        FeatureExtension = self.env.feature_layer.FeatureExtension

        @FeatureExtension.registry.register
        class FeaturePhotoExtension(FeatureExtension):
            identity = 'feature_photo'
            display_widget = 'feature_photo/DisplayWidget'

            comp = self

            def feature_data(self, feature):
                DBSession = self.comp.env.core.DBSession
                q = DBSession.query(FeaturePhoto.id) \
                    .filter_by(layer_id=self.layer.id, feature_id=feature.id)

                photo_ids = map(lambda row: row[0], q)
                if len(photo_ids) > 0:
                    return photo_ids

            @property
            def feature_widget(self):
                class _Widget(self.comp.FeaturePhotoEditWidget):
                    layer = self.layer

                return _Widget

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
