from pathlib import Path
from unittest.mock import patch

import pytest

from nextgisweb.env import DBSession

from nextgisweb.core.exception import ValidationError
from nextgisweb.point_cloud import PointCloud
from nextgisweb.point_cloud_style import PointCloudStyle
from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.resource.test import ResourceAPI
from nextgisweb.spatial_ref_sys import WKT_EPSG_3857

from ..validation import PointCloudExtent, PointCloudValidationResult, _validate_source

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(autouse=True)
def _create_tables(ngw_txn):
    bind = DBSession.connection()
    PointCloud.__table__.create(bind=bind, checkfirst=True)
    PointCloudStyle.__table__.create(bind=bind, checkfirst=True)


class _FakePointFormat:
    def __init__(self, id):
        self.id = id


class _FakeHeader:
    def __init__(
        self,
        *,
        point_format_id=7,
        point_count=42,
        mins=(1.0, 2.0, 3.0),
        maxs=(4.0, 5.0, 6.0),
        crs=None,
    ):
        self.point_format = _FakePointFormat(point_format_id)
        self.point_count = point_count
        self.mins = mins
        self.maxs = maxs
        self._crs = crs

    def parse_crs(self):
        return self._crs


class _FakeCRS:
    def __init__(self, *, epsg=3857, wkt=WKT_EPSG_3857):
        self._epsg = epsg
        self._wkt = wkt

    def to_epsg(self):
        return self._epsg

    def to_wkt(self):
        return self._wkt


class _FakePoints:
    def __init__(self, n=1):
        self.array = [None] * n


class _FakeReader:
    def __init__(self, header, npoints=1):
        self.header = header
        self._npoints = npoints

    def query(self, *, level=0):
        assert level == 0
        return _FakePoints(self._npoints)

    def close(self):
        pass


def _validation_result(**overrides):
    data = dict(
        point_count=42,
        point_format_id=7,
        epsg=3857,
        wkt=WKT_EPSG_3857,
        srs_required=False,
        extent=PointCloudExtent(minLon=1, minLat=2, maxLon=4, maxLat=5),
        minx=1,
        miny=2,
        maxx=4,
        maxy=5,
        zmin=3,
        zmax=6,
        has_rgb=True,
        has_intensity=True,
        has_classification=True,
        has_returns=True,
    )
    data.update(overrides)
    return PointCloudValidationResult(**data)


def test_validate_source_success():
    header = _FakeHeader(crs=_FakeCRS())
    with patch(
        "nextgisweb.point_cloud.validation._open_copc_reader", return_value=_FakeReader(header)
    ):
        result = _validate_source("/tmp/test.copc.laz")

    assert result.point_count == 42
    assert result.point_format_id == 7
    assert result.epsg == 3857
    assert result.has_rgb is True
    assert result.srs_required is False


def test_validate_source_invalid_pdrf():
    header = _FakeHeader(point_format_id=3, crs=_FakeCRS())
    with patch(
        "nextgisweb.point_cloud.validation._open_copc_reader", return_value=_FakeReader(header)
    ):
        with pytest.raises(ValidationError):
            _validate_source("/tmp/test.copc.laz")


def test_validate_source_without_crs():
    header = _FakeHeader(crs=None)
    with patch(
        "nextgisweb.point_cloud.validation._open_copc_reader", return_value=_FakeReader(header)
    ):
        result = _validate_source("/tmp/test.copc.laz")

    assert result.srs_required is True
    assert result.extent is None


def test_validate_endpoint_upload(ngw_webtest_app: WebTestApp, ngw_file_upload, tmp_path: Path):
    source = tmp_path / "source.copc.laz"
    source.write_bytes(b"copc")
    upload_meta = ngw_file_upload(source)

    with patch(
        "nextgisweb.point_cloud.api.validate_upload",
        return_value=_validation_result(),
    ):
        resp = ngw_webtest_app.post(
            "/api/component/point_cloud/validate",
            json={"source_type": "upload", "file_upload": upload_meta},
            status=200,
        )

    assert resp.json["is_valid"] is True
    assert resp.json["point_count"] == 42


def test_validate_endpoint_invalid_url(ngw_webtest_app: WebTestApp):
    with patch(
        "nextgisweb.point_cloud.api.validate_external_url",
        side_effect=ValidationError(message="bad url"),
    ):
        resp = ngw_webtest_app.post(
            "/api/component/point_cloud/validate",
            json={"source_type": "external_url", "url": "ftp://example.com/a.copc.laz"},
            status=200,
        )

    assert resp.json["is_valid"] is False
    assert resp.json["reason"] == "bad url"


def test_create_from_upload(
    ngw_webtest_app: WebTestApp,
    ngw_file_upload,
    ngw_resource_group,
    tmp_path: Path,
):
    source = tmp_path / "source.copc.laz"
    source.write_bytes(b"copc")
    upload_meta = ngw_file_upload(source)

    with patch(
        "nextgisweb.point_cloud.model.validate_upload",
        return_value=_validation_result(),
    ):
        res_id = ResourceAPI().create(
            "point_cloud",
            {
                "resource": {"parent": {"id": ngw_resource_group}},
                "point_cloud": {"source": upload_meta},
            },
        )

    resp = ngw_webtest_app.get(f"/api/resource/{res_id}", status=200)
    assert resp.json["point_cloud"]["source_type"] == "upload"
    assert resp.json["point_cloud"]["point_format_id"] == 7
    assert resp.json["point_cloud"]["has_rgb"] is True


def test_create_from_external_url(ngw_webtest_app: WebTestApp, ngw_resource_group):
    with patch(
        "nextgisweb.point_cloud.model.validate_external_url",
        return_value=_validation_result(epsg=None, wkt=None, srs_required=True, extent=None),
    ):
        res_id = ResourceAPI().create(
            "point_cloud",
            {
                "resource": {"parent": {"id": ngw_resource_group}},
                "point_cloud": {
                    "external_url": "https://example.com/source.copc.laz",
                    "srs": {"id": 3857},
                },
            },
        )

    resp = ngw_webtest_app.get(f"/api/resource/{res_id}", status=200)
    assert resp.json["point_cloud"]["source_type"] == "external_url"
    assert resp.json["point_cloud"]["external_url"] == "https://example.com/source.copc.laz"


def test_style_parent_and_value(ngw_webtest_app: WebTestApp, ngw_resource_group):
    with patch(
        "nextgisweb.point_cloud.model.validate_external_url",
        return_value=_validation_result(),
    ):
        point_cloud_id = ResourceAPI().create(
            "point_cloud",
            {
                "resource": {"parent": {"id": ngw_resource_group}},
                "point_cloud": {"external_url": "https://example.com/source.copc.laz"},
            },
        )

    style_value = {
        "mode": "classification",
        "point_size": 3,
        "opacity": 90,
        "use_percentile_clip": True,
        "elevation_min_percent": 2,
        "elevation_max_percent": 98,
        "ramp_start_color": "#2b83ba",
        "ramp_end_color": "#fdae61",
        "intensity_modulation": True,
        "classification_colors": [{"code": 2, "color": "#8c510a"}],
    }

    style_id = ResourceAPI().create(
        "point_cloud_style",
        {
            "resource": {"parent": {"id": point_cloud_id}},
            "point_cloud_style": {"value": style_value},
        },
    )

    resp = ngw_webtest_app.get(f"/api/resource/{style_id}", status=200)
    assert resp.json["point_cloud_style"]["value"]["mode"] == "classification"

    ResourceAPI().create_request(
        "point_cloud_style",
        {
            "resource": {"parent": {"id": ngw_resource_group}},
            "point_cloud_style": {"value": style_value},
        },
        status=422,
    )
