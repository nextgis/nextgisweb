# -*- coding: utf-8 -*-

'''Utilities to convert nextgisweb layers to featureserver datasources
'''

from __future__ import unicode_literals

import geojson

from nextgisweb.feature_layer import IWritableFeatureLayer

from .third_party.FeatureServer.DataSource import DataSource
from .third_party.vectorformats.Feature import Feature

from .third_party.FeatureServer.WebFeatureService.Response.InsertResult import InsertResult
from .third_party.FeatureServer.WebFeatureService.Response.UpdateResult import UpdateResult
from .third_party.FeatureServer.WebFeatureService.Response.DeleteResult import DeleteResult


class NextgiswebDatasource(DataSource):
    '''Class to convert nextgislayer to featureserver datasource
    '''

    def __init__(self, name,  **kwargs):
        DataSource.__init__(self, name, **kwargs)
        self.layer = kwargs["layer"]
        self.title = kwargs["title"]
        self.query = self.layer.feature_query()
        self.srid_out = self.layer.srs_id
        if 'attribute_cols' in kwargs:
            self.attribute_cols = kwargs['attribute_cols']
        else:
            self.set_attribute_cols(self.query)

        # Setup geometry column name. But some resources do not provide the name
        try:
            self.geom_col = self.layer.column_geom
        except AttributeError:
            self.geom_col = u'none'

    # FeatureServer.DataSource
    def select (self, params):
        self.query.filter_by()
        # query.filter_by(OSM_ID=2379362827)
        self.query.geom()
        result = self.query()

        features = []
        for row in result:
            feature = Feature(id=row.id, props=row.fields)
            feature.geometry_attr = self.geom_col
            geom = geojson.dumps(row.geom)

            # featureserver.feature.geometry is a dict, so convert str->dict:
            feature.set_geo(geojson.loads(geom))
            features.append(feature)

        return features

    def update (self, action):
        """ В action.wfsrequest хранится объект Transaction.Update
        нужно его распарсить и выполнить нужные действия
        """

        if not IWritableFeatureLayer.providedBy(self.layer):
            # Слой не редактируемый
            return None

        # if action.feature != None:
        #     feature = action.feature
        #     predicates = ", ".join( self.feature_predicates(feature) )
        #
        #     sql = "UPDATE \"%s\" SET %s WHERE %s = %d" % ( self.table, predicates, self.fid_col, action.id )
        #
        #     cursor = self.db.cursor()
        #     cursor.execute(str(sql), self.feature_values(feature))
        #
        #     return UpdateResult(action.id, "")

        if action.wfsrequest != None:
            data = action.wfsrequest.getStatement(self)
            id = data['filter']['id']

            self.query.filter_by(id=id)
            self.query.geom()
            result = self.query()

            feat = result.one()
            for field_name in feat.fields:
                if data.has_key(field_name):
                    feat.fields[field_name] = data[field_name].text
            self.layer.feature_put(feat)

            return UpdateResult(action.id, "")

        return None

    def getAttributeDescription(self, attribute):
        length = ''
        try:
            type = self.layer.field_by_keyname(attribute)
            type = type.keyname
        except KeyError: # the attribute can be=='*', that causes KeyError
            type = 'string'

        return (type, length)

    def set_attribute_cols(self, query):
        columns = [f.keyname for f in query.layer.fields]
        self.attribute_cols = ','.join(columns)




