from contextlib import contextmanager

import transaction
from osgeo import ogr
import pytest

from nextgisweb.auth import User
from nextgisweb.env import env
from nextgisweb.lib.ogrhelper import FIELD_GETTER
from nextgisweb.models import DBSession
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.postgis import PostgisConnection, PostgisLayer
from nextgisweb.vector_layer.model import (
    _GEOM_OGR_2_TYPE, _GEOM_TYPE_2_DB,
    _FIELD_TYPE_2_ENUM, _FIELD_TYPE_2_DB)


import sqlalchemy as sa
import geoalchemy2 as ga
from sqlalchemy.engine.url import (
    URL as EngineURL,
    make_url as make_engine_url)


@contextmanager
def create_feature_layer(ogrlayer, parent_id, **kwargs):
    opts_db = env.core.options.with_prefix('database_test')

    for o in ('host', 'name', 'user'):
        pytest.skip(f"Option database_test.{o} isn't set")

    con_args = dict(
        host=opts_db['host'],
        port=opts_db['port'],
        database=opts_db['name'],
        username=opts_db['user'],
        password=opts_db['password'])

    engine_url = make_engine_url(EngineURL(
        'postgresql+psycopg2', **con_args))

    engine = sa.create_engine(engine_url)
    meta = sa.MetaData()

    column_id = 'id'
    columns = [sa.Column(column_id, sa.Integer, primary_key=True)]

    column_geom = 'the_geom'
    geom_type = _GEOM_OGR_2_TYPE[ogrlayer.GetGeomType()]
    osr_ = ogrlayer.GetSpatialRef()
    assert osr_.GetAuthorityName(None) == 'EPSG'
    srid = int(osr_.GetAuthorityCode(None))
    columns.append(sa.Column(column_geom, ga.Geometry(
        dimension=2, srid=srid,
        geometry_type=_GEOM_TYPE_2_DB[geom_type])))

    defn = ogrlayer.GetLayerDefn()
    for i in range(defn.GetFieldCount()):
        fld_defn = defn.GetFieldDefn(i)
        fld_name = fld_defn.GetNameRef()
        fld_type = _FIELD_TYPE_2_ENUM[fld_defn.GetType()]
        columns.append(sa.Column(fld_name, _FIELD_TYPE_2_DB[fld_type]))

    table = sa.Table('postgis_test', meta, *columns)

    meta.create_all(engine)

    with engine.connect() as conn:
        for i, feature in enumerate(ogrlayer, start=1):
            values = dict(id=i)

            geom = feature.GetGeometryRef()
            geom_bytes = bytearray(geom.ExportToWkb(ogr.wkbNDR))
            values[column_geom] = ga.elements.WKBElement(geom_bytes, srid=srid)

            for k in range(feature.GetFieldCount()):
                if not feature.IsFieldSet(k) or feature.IsFieldNull(k):
                    continue
                fld_defn = defn.GetFieldDefn(k)
                fld_name = fld_defn.GetNameRef()
                fld_get = FIELD_GETTER[fld_defn.GetType()]
                values[fld_name] = fld_get(feature, k)

            conn.execute(table.insert().values(**values))

    with transaction.manager:
        res_common = dict(
            parent_id=parent_id,
            owner_user=User.by_keyname('administrator'))

        connection = PostgisConnection(
            **res_common, display_name='PostGIS connection',
            hostname=opts_db['host'], port=opts_db['port'],
            database=opts_db['name'], username=opts_db['user'],
            password=opts_db['password']
        ).persist()

        layer = PostgisLayer(
            **res_common, display_name='Feature layer (postgis)',
            connection=connection, srs=SRS.filter_by(id=3857).one(),
            table=table.name, schema='public',
            column_id=column_id, column_geom=column_geom,
            geometry_type=geom_type, geometry_srid=srid,
        ).persist()

        DBSession.flush()

        layer.setup()

    try:
        yield layer
    finally:
        with transaction.manager:
            DBSession.delete(PostgisLayer.filter_by(id=layer.id).one())
            DBSession.delete(PostgisConnection.filter_by(id=connection.id).one())
        meta.drop_all(engine)
        engine.dispose()
