import os.path

import transaction

from osgeo import gdal
from nextgisweb.auth import User
from nextgisweb.models import DBSession
from nextgisweb.raster_layer.model import RasterLayer
from nextgisweb.spatial_ref_sys import SRS

from .validate_cloud_optimized_geotiff import validate


def test_cog(ngw_webtest_app, ngw_resource_group, ngw_env):
    source = "sochi-aster-dem.tif"
    source_srs_id = 4326
    src = os.path.join(os.path.split(__file__)[0], "data", source)

    with transaction.manager:
        res = RasterLayer(
            parent_id=ngw_resource_group,
            display_name="test_cog:{}".format(source),
            owner_user=User.by_keyname("administrator"),
            srs=SRS.filter_by(id=source_srs_id).one(),
        ).persist()

        res.load_file(src, ngw_env, cog=False)

        DBSession.flush()
        DBSession.expunge(res)

    ds = gdal.Open(ngw_env.raster_layer.workdir_filename(res.fileobj))
    cs = ds.GetRasterBand(1).Checksum()

    ngw_webtest_app.put_json(
        f"/api/resource/{res.id}", dict(raster_layer=dict(cog=True))
    )
    res = RasterLayer.filter_by(id=res.id).one()
    fn = ngw_env.raster_layer.workdir_filename(res.fileobj)
    warnings, errors, _ = validate(fn, full_check=True)
    assert len(errors) == 0

    ngw_webtest_app.put_json(
        f"/api/resource/{res.id}", dict(raster_layer=dict(cog=False))
    )
    res = RasterLayer.filter_by(id=res.id).one()
    fn = ngw_env.raster_layer.workdir_filename(res.fileobj)
    ds = gdal.Open(fn)
    warnings, errors, _ = validate(fn, full_check=True)
    assert len(errors) == 1
    assert cs == ds.GetRasterBand(1).Checksum()
