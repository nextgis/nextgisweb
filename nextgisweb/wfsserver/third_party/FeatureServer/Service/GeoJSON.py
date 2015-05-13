"""
This code is based on code of MetaCarta.

Some changes are done by NextGIS
"""

__author__  = "MetaCarta"
__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD"


from ...vectorformats.Formats.GeoJSON import GeoJSON as GS
from ...FeatureServer.Service.Request import Request
from ...FeatureServer.Service.Action import Action
from ...vectorformats.Feature import Feature

import geojson

class GeoJSON(Request):
    def __init__(self, service):
        Request.__init__(self, service)
        self.callback = None

    def encode_metadata(self, action):
        layers = self.service.datasources
        metadata = []
        for key in layers.keys():
            metadata.append(
              {
                'name': key,
                'url': "%s/%s" % (self.host, key)
              }
            )

        result_data = {'Layers': metadata}

        result = geojson.dumps(result_data)
        if self.callback:
            result = "%s(%s);" % (self.callback, result)

        return ("text/plain", result, None)

    def parse(self, params, path_info, host, post_data, request_method, format_obj=None):
        if 'callback' in params:
            self.callback = params['callback']
        g = GS()
        Request.parse(self, params, path_info, host, post_data, request_method, format_obj=g)

    def encode(self, result):
        g = GS()
        if result and result[0].srs:
            # all features have the same 'srs' property
            crs = {"type": "name",
                        "properties": {"name": "EPSG:%s" % (result[0].srs ,)}
                  }
            g.crs = crs
        result = g.encode(result)

        if self.datasources[0]:
            datasource = self.service.datasources[self.datasources[0]]

        if self.callback and datasource and hasattr(datasource, 'gaping_security_hole'):
            return ("text/plain", "%s(%s);" % (self.callback, result), None, 'utf-8')
        else:
            return ("text/plain", result, None, 'utf-8')

    def encode_exception_report(self, exceptionReport):
        geojson = GS()
        return ("text/plain", geojson.encode_exception_report(exceptionReport), None, 'utf-8')

