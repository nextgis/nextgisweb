# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
import json
from datetime import date, time, datetime

from osgeo import ogr

from nextgisweb.lib.ogrhelper import read_layer_features


DATA = {
    "type": "FeatureCollection",
    "name": "layer",
    "crs": {
        "type": "name",
        "properties": {
            "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
        }
    },
    "features": [
        {
            "type": "Feature",
            "properties": {
                "null": None,
                "int": -1,
                "real": 0.33333333333333298,
                "date": "2001-01-01",
                "time": "23:59:59.250",
                "datetime": "2001-01-01 23:59:00.250",
                "string": "Foo bar",
                "unicode": "Юникод"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [
                    0.0,
                    0.0,
                    0.0
                ]
            }
        }
    ]
}


def test_read():
    dataset = ogr.Open(json.dumps(DATA))
    layer = dataset.GetLayer(0)

    fid, geom, fields = list(read_layer_features(layer, 'wkt'))[0]
    tdict = dict(fields)

    assert fid == 0
    assert geom == 'POINT (0 0 0)'
    assert tdict['null'] is None
    assert tdict["int"] == -1
    assert tdict["real"] == 0.33333333333333298
    assert tdict["date"] == date(2001, 1, 1)
    assert tdict["time"] == time(23, 59, 59, 250)
    assert tdict["datetime"] == datetime(2001, 1, 1, 23, 59, 0, 250)
    assert tdict["string"] == "Foo bar"
    assert tdict["unicode"] == "Юникод"
