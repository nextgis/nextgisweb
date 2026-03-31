import pytest
from osgeo import gdal

from nextgisweb.spatial_ref_sys import SRS

from ..model import RasterLayer, RasterLayerStorage

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults")


def test_s3_storage(s3_storage_creds, ngw_commit, ngw_data_path, request):
    storage = RasterLayerStorage(**s3_storage_creds).persist()

    layer = RasterLayer(srs=SRS.filter_by(id=3857).one(), storage=storage).persist()
    layer.load_file(ngw_data_path / "sochi-aster-dem.tif")

    s3_path = storage.vsi_path(layer.storage_filename)
    vsi_creds = storage.vsi_credentials()

    def cleanup():
        with gdal.config_options(vsi_creds):
            gdal.Unlink(s3_path)

    request.addfinalizer(cleanup)

    ds = layer.gdal_dataset()
    assert ds is not None
    assert ds.RasterXSize == layer.xsize
    assert ds.RasterYSize == layer.ysize
    assert ds.RasterCount == layer.band_count
