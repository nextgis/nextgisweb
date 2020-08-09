# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import numpy as np

from nextgisweb.spatial_ref_sys.models import SRS, BOUNDS_EPSG_3857
from nextgisweb.tmsclient import Layer


def image_compare(im1, im2):
    arr1 = np.asarray(im1, np.float32)
    arr2 = np.asarray(im2, np.float32)
    return np.array_equal(arr1, arr2)


def test_layer(ngw_webtest_app, ngw_auth_administrator, ngw_resource_group):
    data = dict(
        resource=dict(
            cls='tmsclient_connection', display_name='test-tms_connection',
            parent=dict(id=ngw_resource_group),
        ),
        tmsclient_connection=dict(
            url_template='https://tile.openstreetmap.fr/{layer}/{z}/{x}/{y}.png',
            scheme='xyz',
        ),
    )
    resp = ngw_webtest_app.post_json('/api/resource/', data, status=201)
    connection_id = resp.json['id']

    maxzoom = 3
    data = dict(
        resource=dict(
            cls='tmsclient_layer', display_name='test-tms_layer',
            parent=dict(id=ngw_resource_group),
        ),
        tmsclient_layer=dict(
            connection=dict(id=connection_id),
            srs=dict(id=3857),
            layer_name='hot',
            minzoom=0,
            maxzoom=maxzoom,
        ),
    )
    resp = ngw_webtest_app.post_json('/api/resource/', data, status=201)
    layer_id = resp.json['id']

    ngw_webtest_app.get('/api/component/render/tile?z=%d&x=0&y=0&resource=%d' % (
        maxzoom + 1, layer_id), status=422)

    layer = Layer.filter_by(id=layer_id).one()
    srs = SRS.filter_by(id=3857).one()
    req = layer.render_request(srs)

    image1 = req.render_tile((0, 0, 0), 256)
    image2 = req.render_extent(BOUNDS_EPSG_3857, (256, 256))
    assert image_compare(image1, image2)

    image1 = req.render_tile((1, 0, 0), 256)
    image2 = req.render_extent(BOUNDS_EPSG_3857, (512, 512))

    assert image_compare(image1, image2.crop((0, 0, 256, 256)))

    ngw_webtest_app.delete('/api/resource/%d' % layer_id, status=200)
    ngw_webtest_app.delete('/api/resource/%d' % connection_id, status=200)
