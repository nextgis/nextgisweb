# -*- coding: utf-8 -*-

'''Utilities to convert nextgisweb layers to featureserver datasources
'''

from __future__ import unicode_literals

import geojson

from .third_party.FeatureServer.DataSource import DataSource
from .third_party.vectorformats.Feature import Feature



class NextgiswebDatasource(DataSource):
    '''Class to convert nextgislayer to featureserver datasource
    '''

    def __init__(self, name,  attribute_cols = '*', **args):
        DataSource.__init__(self, name, **args)
        self.layer          = args["layer"]
        self.attribute_cols = attribute_cols
        self.geom_col = u'none'

    # FeatureServer.DataSource
    def select (self, params):
        print 'params=', params
        query = self.layer.feature_query()
        query.filter_by()
        # query.filter_by(OSM_ID=2379362827)
        query.geom()
        result = query()

        features = []
        for row in result:
            feature = Feature(id=row.id, props=row.fields)
            geom = geojson.dumps(row.geom)

            # featureserver.feature.geometry is a dict, so convert str->dict:
            feature.set_geo(geojson.loads(geom))
            features.append(feature)

        return features

    def getAttributeDescription(self, attribute):
        length = ''
        try:
            type = self.layer.field_by_keyname(attribute)
        except KeyError: # the attribute can be=='*', that causes KeyError
            type = 'string'

        return (type, length)




