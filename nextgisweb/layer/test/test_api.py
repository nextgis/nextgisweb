from pathlib import Path

import pytest
from osgeo import ogr, gdalconst

import nextgisweb.feature_layer.test
from nextgisweb.postgis.test import create_feature_layer as create_postgis_layer
from nextgisweb.vector_layer.test import create_feature_layer as create_vector_layer


def layer_product():
    for cfunc, alias in (
        (create_vector_layer, 'vector_layer'),
        (create_postgis_layer, 'postgis_layer'),
    ):
        for geom_type in (
            'point', 'pointz', 'multipoint', 'multipointz',
            'linestring', 'linestringz', 'multilinestring', 'multilinestringz',
            'polygon', 'polygonz', 'multipolygon', 'multipolygonz',
        ):
            data = Path(nextgisweb.feature_layer.test.__file__).parent \
                / 'data' / 'geometry' / f'{geom_type}.geojson'
            ds = ogr.Open(str(data), gdalconst.GA_ReadOnly)
            # Should return whole DataSource, otherwise it will be destroyed
            yield pytest.param(cfunc, ds, id=f'{alias}-{geom_type}')


@pytest.mark.parametrize('create_resource, ds', layer_product())
def test_extent(create_resource, ds, ngw_resource_group_sub, ngw_webtest_app, ngw_auth_administrator):
    ogrlayer = ds.GetLayer(0)
    with create_resource(ogrlayer, ngw_resource_group_sub) as layer:
        resp = ngw_webtest_app.get('/api/resource/%d/extent' % layer.id, status=200)
        extent = resp.json['extent']
        extent_ogr = ogrlayer.GetExtent()
        for i, p in enumerate(('minLon', 'maxLon', 'minLat', 'maxLat')):
            assert extent[p] == pytest.approx(extent_ogr[i])
