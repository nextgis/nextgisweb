import os.path
from osgeo import gdal
from tempfile import NamedTemporaryFile

import pytest

from nextgisweb.auth import User
from nextgisweb.core.exception import ValidationError
from nextgisweb.models import DBSession
from nextgisweb.spatial_ref_sys import SRS

from nextgisweb.raster_layer.model import RasterLayer
from .validate_cloud_optimized_geotiff import validate


@pytest.mark.parametrize('source, band_count, srs_id', [
    # Both rasters haven't NODATA value, so the alpha band is expected to be
    # added in case of reprojection from EPSG:4326 to EPSG:3857.
    ('sochi-aster-colorized.tif', 4, 3857),
    ('sochi-aster-colorized.tif', 3, 4326),
    ('sochi-aster-dem.tif', 2, 3857),
    ('sochi-aster-dem.tif', 1, 4326),
])
@pytest.mark.parametrize('cog', [False, True])
def test_load_file(
    source, band_count, srs_id, ngw_env, ngw_txn, ngw_resource_group, cog
):
    res = RasterLayer(
        parent_id=ngw_resource_group, display_name='test:{}'.format(source),
        owner_user=User.by_keyname('administrator'),
        srs=SRS.filter_by(id=srs_id).one(),
    ).persist()

    res.load_file(
        os.path.join(os.path.split(__file__)[0], "data", source),
        ngw_env,
        cog,
    )
    assert res.band_count == band_count

    fn_data = ngw_env.file_storage.filename(res.fileobj)
    assert not os.path.islink(fn_data)

    fn_work = ngw_env.raster_layer.workdir_filename(res.fileobj)
    assert os.path.islink(fn_work) and os.path.realpath(fn_work) == fn_data

    warnings, errors, _ = validate(fn_work, full_check=True)
    if cog:
        assert len(errors) == 0

    if not cog:
        assert len(errors) == 1


@pytest.mark.parametrize('size_limit, width, height, band_count, datatype, ok', (
    (100, 10, 10, 1, gdal.GDT_Byte, True),
    (100, 10, 10, 1, gdal.GDT_UInt16, False),
    (None, 10, 10, 1, gdal.GDT_UInt16, True),
    (1000, 10, 6, 2, gdal.GDT_CFloat32, True),
    (1000, 10, 7, 2, gdal.GDT_CFloat32, False),
))
def test_size_limit(size_limit, width, height, band_count, datatype, ok, ngw_env, ngw_resource_group):
    res = RasterLayer(
        parent_id=ngw_resource_group, display_name='test-raster-limit',
        owner_user=User.by_keyname('administrator'),
        srs=SRS.filter_by(id=3857).one(),
    ).persist()

    driver = gdal.GetDriverByName('GTiff')
    proj = res.srs.to_osr()
    proj_wkt = proj.ExportToWkt()

    with ngw_env.raster_layer.options.override(dict(size_limit=size_limit)):
        with NamedTemporaryFile('w') as f:
            ds = driver.Create(f.name, width, height, band_count, datatype)
            ds.SetProjection(proj_wkt)
            ds.FlushCache()
            ds = None
            f.flush()

            if ok:
                res.load_file(f.name, ngw_env)
            else:
                with pytest.raises(ValidationError):
                    res.load_file(f.name, ngw_env)

    DBSession.expunge(res)


@pytest.mark.parametrize('source, size_expect', (
    ('sochi-aster-colorized.tif', 13800),
    ('sochi-aster-dem.tif', 608224)
))
def test_size_limit_reproj(source, size_expect, ngw_env, ngw_resource_group):
    res = RasterLayer(
        parent_id=ngw_resource_group, display_name='test-raster-limit-reproj',
        owner_user=User.by_keyname('administrator'),
        srs=SRS.filter_by(id=3857).one(),
    ).persist()

    filename = os.path.join(os.path.split(__file__)[0], 'data', source)

    with ngw_env.raster_layer.options.override(dict(size_limit=size_expect - 100)):
        with pytest.raises(ValidationError):
            res.load_file(filename, ngw_env)

    with ngw_env.raster_layer.options.override(dict(size_limit=size_expect)):
        res.load_file(filename, ngw_env)

    DBSession.expunge(res)
