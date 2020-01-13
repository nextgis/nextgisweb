# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import webtest


def test_identify(env, webapp):
    data = {
        "srs": 3857,
        "geom": "POLYGON((0 0,0 1,1 1,1 0,0 0))",
        "layers": []
    }
    resp = webapp.post_json("/api/feature_layer/identify", data, status=200)
    assert resp.json["featureCount"] == 0
