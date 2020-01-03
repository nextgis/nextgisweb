# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from collections import OrderedDict

from ..component import Component, require

from .feature import Feature, FeatureSet
from .model import Base, LayerField, LayerFieldsMixin
from .interface import (
    GEOM_TYPE,
    GEOM_TYPE_OGR,
    FIELD_TYPE,
    FIELD_TYPE_OGR,
    IFeatureLayer,
    IWritableFeatureLayer,
    IFeatureQuery,
    IFeatureQueryFilter,
    IFeatureQueryFilterBy,
    IFeatureQueryOrderBy,
    IFeatureQueryLike,
    IFeatureQueryIntersects,
    IFeatureQueryClipByBox,
    IFeatureQuerySimplify,
)
from .event import on_data_change
from .extension import FeatureExtension
from .api import query_feature_or_not_found
from .ogrdriver import OGR_DRIVER_NAME_2_EXPORT_FORMATS

__all__ = [
    'Feature',
    'FeatureSet',
    'LayerField',
    'LayerFieldsMixin',
    'GEOM_TYPE',
    'GEOM_TYPE_OGR',
    'FIELD_TYPE',
    'FIELD_TYPE_OGR',
    'IFeatureLayer',
    'IWritableFeatureLayer',
    'IFeatureQuery',
    'IFeatureQueryFilter',
    'IFeatureQueryFilterBy',
    'IFeatureQueryOrderBy',
    'IFeatureQueryLike',
    'IFeatureQueryIntersects',
    'IFeatureQueryClipByBox',
    'IFeatureQuerySimplify',
    'on_data_change',
    'query_feature_or_not_found',
]


class FeatureLayerComponent(Component):
    identity = 'feature_layer'
    metadata = Base.metadata

    def initialize(self):
        self.settings['identify.attributes'] = \
            self.settings.get('identify.attributes', 'true').lower() == 'true'

        self.settings['search.nominatim'] = \
            self.settings.get('search.nominatim', 'true').lower() == 'true'

        self.FeatureExtension = FeatureExtension

    @require('resource')
    def setup_pyramid(self, config):
        from . import view, api
        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def client_settings(self, request):
        editor_widget = OrderedDict()
        for k, ecls in FeatureExtension.registry._dict.items():
            if hasattr(ecls, 'editor_widget'):
                editor_widget[k] = ecls.editor_widget

        return dict(
            editor_widget=editor_widget,
            extensions=dict(map(
                lambda ext: (ext.identity, ext.display_widget),
                FeatureExtension.registry
            )),
            identify=dict(
                attributes=self.settings['identify.attributes']
            ),
            search=dict(
                nominatim=self.settings['search.nominatim']
            ),
            export_formats=OGR_DRIVER_NAME_2_EXPORT_FORMATS,
        )

    settings_info = (
        dict(key='identify.attributes', desc=u"Show attributes in identification"),
        dict(key='search.nominatim', desc=u"Use Nominatim while searching")
    )
