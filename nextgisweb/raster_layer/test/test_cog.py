import pytest
import transaction
from osgeo import gdal

from nextgisweb.env import inject

from nextgisweb.spatial_ref_sys import SRS

from ..component import RasterLayerComponent
from ..model import RasterLayer
from .validate_cloud_optimized_geotiff import validate

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.mark.parametrize("srs_id", [3857, 4326])
@inject()
def test_cog(srs_id, ngw_data_path, ngw_webtest_app, ngw_env, *, comp: RasterLayerComponent):
    with transaction.manager:
        res = RasterLayer(srs=SRS.filter_by(id=srs_id).one()).persist()
        res.load_file(ngw_data_path / "sochi-aster-dem.tif", cog=False)

    fdata = res.fileobj.filename()
    assert fdata.exists() and not fdata.is_symlink()

    fwork = comp.workdir_path(res.fileobj)
    ds = gdal.Open(str(fwork))
    cs = ds.GetRasterBand(1).Checksum()

    ngw_webtest_app.put_json(
        f"/api/resource/{res.id}",
        dict(raster_layer=dict(cog=True)),
    )

    resp = ngw_webtest_app.get(f"/api/resource/{res.id}").json
    assert resp["raster_layer"]["cog"] is True

    res = RasterLayer.filter_by(id=res.id).one()
    cog_wd = comp.workdir_path(res.fileobj)
    assert cog_wd != fwork and cog_wd.is_symlink()
    assert not cog_wd.with_suffix(".ovr").is_file()

    warnings, errors, _ = validate(str(cog_wd), full_check=True)
    assert len(errors) == 0 and len(warnings) == 0

    ngw_webtest_app.put_json(
        f"/api/resource/{res.id}",
        dict(raster_layer=dict(cog=False)),
    )

    resp = ngw_webtest_app.get(f"/api/resource/{res.id}").json
    assert resp["raster_layer"]["cog"] is False

    res = RasterLayer.filter_by(id=res.id).one()
    ovr_wd = comp.workdir_path(res.fileobj)
    assert ovr_wd != cog_wd and ovr_wd.is_symlink()
    assert ovr_wd.with_suffix(".ovr").is_file()

    ds = gdal.Open(str(ovr_wd))
    assert cs == ds.GetRasterBand(1).Checksum()
