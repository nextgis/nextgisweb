import pytest
import transaction
from osgeo import gdal

from nextgisweb.env import inject

from nextgisweb.spatial_ref_sys import SRS

from ..component import RasterLayerComponent
from ..model import RasterLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@inject()
def test_cog_rgb_overview_jpeg_compression(
    ngw_data_path,
    ngw_env,
    *,
    comp: RasterLayerComponent,
):
    with transaction.manager:
        res = RasterLayer(srs=SRS.filter_by(id=3857).one()).persist()
        res.load_file(ngw_data_path / "rounds.tif", cog=True)

    fwork = comp.workdir_path(res.fileobj, res.fileobj_pam)

    main_ds = gdal.Open(str(fwork))
    main_compression = main_ds.GetMetadataItem("COMPRESSION", "IMAGE_STRUCTURE")

    ovr_ds = gdal.OpenEx(str(fwork), gdal.GA_ReadOnly, open_options=["OVERVIEW_LEVEL=0"])
    ovr_compression = ovr_ds.GetMetadataItem("COMPRESSION", "IMAGE_STRUCTURE")

    assert ovr_compression == "JPEG"
    assert ovr_compression != main_compression


@inject()
def test_external_rgb_overview_jpeg_compression(
    ngw_data_path,
    ngw_env,
    *,
    comp: RasterLayerComponent,
):
    with transaction.manager:
        res = RasterLayer(srs=SRS.filter_by(id=3857).one()).persist()
        res.load_file(ngw_data_path / "rounds.tif", cog=False)

    fwork = comp.workdir_path(res.fileobj, res.fileobj_pam)

    main_ds = gdal.Open(str(fwork))
    main_compression = main_ds.GetMetadataItem("COMPRESSION", "IMAGE_STRUCTURE")

    ovr_file = fwork.with_suffix(".ovr")
    ovr_ds = gdal.Open(str(ovr_file))
    ovr_compression = ovr_ds.GetMetadataItem("COMPRESSION", "IMAGE_STRUCTURE")

    assert ovr_compression == "JPEG"
    assert ovr_compression != main_compression
