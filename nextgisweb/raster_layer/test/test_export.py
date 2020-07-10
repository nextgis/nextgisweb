# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import os.path
import pytest
import transaction

from osgeo import gdal, osr
from tempfile import NamedTemporaryFile

from nextgisweb.raster_layer.model import RasterLayer
from nextgisweb.raster_layer.gdaldriver import EXPORT_FORMAT_GDAL
from nextgisweb.models import DBSession
from nextgisweb.auth import User
from nextgisweb.spatial_ref_sys import SRS


@pytest.fixture(scope="module")
def raster_layer_id(env):
    with transaction.manager:
        obj = RasterLayer(
            parent_id=0,
            display_name="raster_layer.test:export",
            owner_user=User.by_keyname("administrator"),
            srs=SRS.filter_by(id=3857).one(),
        ).persist()

        obj.load_file(
            os.path.join(os.path.split(__file__)[0], "data", "sochi-aster-dem.tif"), env
        )

        DBSession.flush()
        DBSession.expunge(obj)

    yield obj.id

    with transaction.manager:
        DBSession.delete(RasterLayer.filter_by(id=obj.id).one())


@pytest.mark.parametrize("epsg", [4326, 3857,])
def test_export_srs(epsg, webapp, raster_layer_id):
    srs_expected = osr.SpatialReference()
    srs_expected.ImportFromEPSG(epsg)

    webapp.authorization = ("Basic", ("administrator", "admin"))
    resp = webapp.get("/api/resource/%d/export" % raster_layer_id, params={"srs": epsg})
    with NamedTemporaryFile() as f:
        f.write(resp.body)
        ds = gdal.OpenEx(f.name)
        srs = osr.SpatialReference()
        srs.ImportFromWkt(ds.GetProjection())
        assert srs.IsSame(srs_expected)


@pytest.mark.parametrize("format", ["tif",])
def test_export_format(format, webapp, raster_layer_id):
    format_expected = EXPORT_FORMAT_GDAL[format.upper()].name
    webapp.authorization = ("Basic", ("administrator", "admin"))
    resp = webapp.get("/api/resource/%d/export" % raster_layer_id, params={"format": format})
    with NamedTemporaryFile() as f:
        f.write(resp.body)
        ds = gdal.OpenEx(f.name)
        assert ds.GetDriver().ShortName == format_expected
