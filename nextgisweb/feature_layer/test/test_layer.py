import json
from datetime import date, datetime, time
from pathlib import Path

import pytest
from osgeo import ogr

import nextgisweb.feature_layer.test
from nextgisweb.feature_layer import (
    IFeatureQueryFilter,
    IFeatureQueryFilterBy,
    IFeatureQueryOrderBy,
)
from nextgisweb.lib.geometry import Geometry, Transformer
from nextgisweb.postgis.test import create_feature_layer as create_postgis_layer
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.spatial_ref_sys.models import WKT_EPSG_4326
from nextgisweb.vector_layer.test import create_feature_layer as create_vector_layer
from nextgisweb.wfsclient import WFSLayer
from nextgisweb.wfsclient.test import create_feature_layer as create_wfs_layer


data_points = Path(nextgisweb.feature_layer.test.__file__).parent / 'data' / 'points.geojson'
filter_cases = (
    ((('null', 'isnull', 'yes'), ), [1, 2]),
    ((('null', 'isnull', 'no'), ), [3]),
    ((('string', 'eq', 'Foo bar'), ), [1, 3]),
    ((('string', 'ne', 'Foo bar'), ), [2]),
    ((('int', 'eq', 0), ), [2]),
    ((('int', 'eq', 0), ('unicode', 'eq', 'Юникод')), [2]),
    ((('int64', 'ge', 500), ), [1, 2]),
    ((('int64', 'gt', 500), ), [1]),
    ((('int64', 'le', 500), ), [2, 3]),
    ((('int64', 'lt', 500), ), [3]),
)
order_by_cases = (
    ((('asc', 'real'), ), [1, 3, 2]),
    ((('asc', 'date'), ('desc', 'int')), [2, 1, 3]),
)


def cmp_fields(gj_fields, fields):
    assert gj_fields.keys() == fields.keys()

    for k, v in fields.items():
        gjv = gj_fields[k]
        t = type(v)
        if v is None:
            assert gjv is None
        elif t in (str, int):
            assert gjv == v
        elif t == float:
            assert pytest.approx(gjv) == v
        elif t == date:
            assert date.fromisoformat(gjv) == v
        elif t == time:
            assert time.fromisoformat(gjv) == v
        elif t == datetime:
            assert datetime.fromisoformat(gjv) == v
        else:
            raise NotImplementedError("Can't compare {} type.".format(t))


def cmp_geom(gj_geom, geom2, srs):
    geom1 = Geometry.from_geojson(gj_geom)
    if srs.id != 4326:
        t = Transformer(WKT_EPSG_4326, srs.wkt)
        geom1 = t.transform(geom1)
    g1 = geom1.shape
    g2 = geom2.shape
    assert g1.equals_exact(g2, 5e-07)


@pytest.mark.parametrize('create_resource', (
    pytest.param(create_vector_layer, id='vector_layer'),
    pytest.param(create_wfs_layer, id='wfsclient_layer'),
    pytest.param(create_postgis_layer, id='postgis_layer'),
))
def test_attributes(create_resource, ngw_resource_group, ngw_auth_administrator, ngw_httptest_app):
    geojson = json.loads(data_points.read_text())
    gj_fs = geojson['features']

    ds = ogr.Open(str(data_points))
    ogrlayer = ds.GetLayer(0)

    with create_resource(ogrlayer, ngw_resource_group, ngw_httptest_app=ngw_httptest_app) as layer:

        # IFeatureQuery

        query = layer.feature_query()
        result = query()
        assert result.total_count == len(gj_fs)
        for i, f in enumerate(result):
            cmp_fields(gj_fs[i]['properties'], f.fields)
            assert f.geom is None

        # - fields
        fields = ('int', 'string')
        query = layer.feature_query()
        query.fields(*fields)
        for i, f in enumerate(query()):
            gjfields = {k: gj_fs[i]['properties'][k] for k in fields}
            cmp_fields(gjfields, f.fields)

        # - limit
        limit = 1
        query = layer.feature_query()
        query.limit(limit)
        fs = list(query())
        assert len(fs) == limit
        cmp_fields(gj_fs[limit - 1]['properties'], fs[limit - 1].fields)

        offset = 1
        query = layer.feature_query()
        query.limit(limit, offset)
        fs = list(query())
        assert len(fs) == limit
        cmp_fields(gj_fs[offset + limit - 1]['properties'], fs[limit - 1].fields)

        q = layer.feature_query()

        # IFeatureQueryFilter

        if IFeatureQueryFilter.providedBy(q):

            for filter_, ids_expected in filter_cases:
                # Skip unsupported operations
                skip = False
                if isinstance(layer, WFSLayer):
                    for k, op, v in filter_:
                        if op == 'isnull' and v == 'no':
                            skip = True
                            break
                if skip:
                    continue

                query = layer.feature_query()
                query.filter(*filter_)
                ids = [f.id for f in query()]
                assert sorted(ids) == ids_expected

        # IFeatureQueryFilterBy

        if IFeatureQueryFilterBy.providedBy(q):

            for filter_, ids_expected in filter_cases:
                filter_by = dict()
                skip = False
                for k, o, v in filter_:
                    if o != 'eq':
                        skip = True
                        break
                    filter_by[k] = v
                if skip:
                    continue
                query = layer.feature_query()
                query.filter_by(**filter_by)
                ids = [f.id for f in query()]
                assert sorted(ids) == ids_expected

        # IFeatureQueryOrderBy

        if IFeatureQueryOrderBy.providedBy(q):

            for order_by, ids_expected in order_by_cases:
                query = layer.feature_query()
                query.order_by(*order_by)
                ids = [f.id for f in query()]
                assert ids == ids_expected


def geom_type_product():
    for cfunc, alias in (
        (create_vector_layer, 'vector_layer'),
        (create_postgis_layer, 'postgis_layer'),
        (create_wfs_layer, 'wfsclient_layer'),
    ):
        for geom_type in (
            'point', 'pointz', 'multipoint', 'multipointz',
            'linestring', 'linestringz', 'multilinestring', 'multilinestringz',
            'polygon', 'polygonz', 'multipolygon', 'multipolygonz',
        ):
            yield pytest.param(cfunc, geom_type, id=f'{alias}-{geom_type}')


@pytest.mark.parametrize('create_resource, geom_type', geom_type_product())
def test_geometry(create_resource, geom_type, ngw_resource_group, ngw_httptest_app):
    data = Path(nextgisweb.feature_layer.test.__file__).parent \
        / 'data' / 'geometry' / f'{geom_type}.geojson'

    geojson = json.loads(data.read_text())
    gj_fs = geojson['features']

    ds = ogr.Open(str(data))
    ogrlayer = ds.GetLayer(0)

    with create_resource(ogrlayer, ngw_resource_group, ngw_httptest_app=ngw_httptest_app) as layer:

        # IFeatureQuery

        # - geom
        query = layer.feature_query()
        query.geom()
        for i, f in enumerate(query()):
            cmp_geom(gj_fs[i]['geometry'], f.geom, layer.srs)

        # - srs
        srs = SRS.filter_by(id=4326).one()
        query = layer.feature_query()
        query.geom()
        query.srs(srs)
        for i, f in enumerate(query()):
            cmp_geom(gj_fs[i]['geometry'], f.geom, srs)
