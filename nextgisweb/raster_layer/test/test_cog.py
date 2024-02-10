from pathlib import Path

import pytest
import transaction
from osgeo import gdal

from nextgisweb.spatial_ref_sys import SRS

from ..model import RasterLayer
from .validate_cloud_optimized_geotiff import validate

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.mark.parametrize("srs_id", [3857, 4326])
def test_cog(srs_id, ngw_data_path, ngw_webtest_app, ngw_env):
    with transaction.manager:
        res = RasterLayer(srs=SRS.filter_by(id=srs_id).one()).persist()
        res.load_file(ngw_data_path / "sochi-aster-dem.tif", ngw_env, cog=False)

    fdata = res.fileobj.filename()
    assert fdata.exists() and not fdata.is_symlink()

    fwork = Path(ngw_env.raster_layer.workdir_filename(res.fileobj))
    ds = gdal.Open(str(fwork))
    cs = ds.GetRasterBand(1).Checksum()

    ngw_webtest_app.put_json(
        f"/api/resource/{res.id}",
        dict(raster_layer=dict(cog=True)),
    )

    res = RasterLayer.filter_by(id=res.id).one()
    cog_wd = Path(ngw_env.raster_layer.workdir_filename(res.fileobj))
    assert cog_wd != fwork and cog_wd.is_symlink()
    assert not cog_wd.with_suffix(".ovr").is_file()

    warnings, errors, _ = validate(str(cog_wd), full_check=True)
    assert len(errors) == 0 and len(warnings) == 0

    ngw_webtest_app.put_json(
        f"/api/resource/{res.id}",
        dict(raster_layer=dict(cog=False)),
    )

    res = RasterLayer.filter_by(id=res.id).one()
    ovr_wd = Path(ngw_env.raster_layer.workdir_filename(res.fileobj))
    assert ovr_wd != cog_wd and ovr_wd.is_symlink()
    assert ovr_wd.with_suffix(".ovr").is_file()

    ds = gdal.Open(str(ovr_wd))
    assert cs == ds.GetRasterBand(1).Checksum()
