import os.path
from operator import xor
from pathlib import Path
from tempfile import NamedTemporaryFile

import pytest
from osgeo import gdal

from nextgisweb.core.exception import ValidationError
from nextgisweb.spatial_ref_sys import SRS

from ..model import RasterLayer
from .validate_cloud_optimized_geotiff import validate

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults")


@pytest.mark.parametrize(
    "source, band_count, srs_id",
    [
        # Both rasters haven't NODATA value, so the alpha band is expected to be
        # added in case of reprojection from EPSG:4326 to EPSG:3857.
        ("sochi-aster-colorized.tif", 4, 3857),
        ("sochi-aster-colorized.tif", 3, 4326),
        ("sochi-aster-dem.tif", 2, 3857),
        ("sochi-aster-dem.tif", 1, 4326),
    ],
)
@pytest.mark.parametrize("cog", [False, True])
def test_load_file(source, band_count, srs_id, cog, ngw_data_path, ngw_env, ngw_commit):
    res = RasterLayer(srs=SRS.filter_by(id=srs_id).one()).persist()

    res.load_file(ngw_data_path / source, cog=cog)
    assert res.band_count == band_count

    fd = res.fileobj.filename()
    assert fd.exists() and not fd.is_symlink()

    fw = Path(ngw_env.raster_layer.workdir_path(res.fileobj))
    assert fw.exists() and fw.is_symlink()
    assert fw.resolve() == fd.resolve()
    assert os.readlink(fw) == ("../" * 3) + "/".join(["file_storage", *fd.parts[-4:]])
    assert xor(cog, fw.with_suffix(".ovr").is_file())

    if cog:
        warnings, errors, _ = validate(str(fw), full_check=True)
        assert len(errors) == 0 and len(warnings) == 0


@pytest.mark.parametrize(
    "size_limit, width, height, band_count, datatype, ok",
    (
        (100, 10, 10, 1, gdal.GDT_Byte, True),
        (100, 10, 10, 1, gdal.GDT_UInt16, False),
        (None, 10, 10, 1, gdal.GDT_UInt16, True),
        (1000, 10, 6, 2, gdal.GDT_CFloat32, True),
        (1000, 10, 7, 2, gdal.GDT_CFloat32, False),
    ),
)
def test_size_limit(size_limit, width, height, band_count, datatype, ok, ngw_env):
    res = RasterLayer()
    driver = gdal.GetDriverByName("GTiff")
    with ngw_env.raster_layer.options.override(dict(size_limit=size_limit)):
        with NamedTemporaryFile("w") as f:
            ds = driver.Create(f.name, width, height, band_count, datatype)
            ds.SetProjection(res.srs.to_osr().ExportToWkt())
            ds.FlushCache()
            ds = None
            f.flush()

            if ok:
                res.load_file(f.name)
            else:
                with pytest.raises(ValidationError):
                    res.load_file(f.name)


@pytest.mark.parametrize(
    "source, expected_size",
    [
        ("sochi-aster-colorized.tif", 13800),
        ("sochi-aster-dem.tif", 608224),
    ],
)
def test_size_limit_reproj(source, expected_size, ngw_commit, ngw_data_path, ngw_env):
    res = RasterLayer().persist()
    filename = ngw_data_path / source

    with ngw_env.raster_layer.options.override(dict(size_limit=expected_size - 100)):
        with pytest.raises(ValidationError):
            res.load_file(filename)

    with ngw_env.raster_layer.options.override(dict(size_limit=expected_size)):
        res.load_file(filename)
