from pathlib import Path
from unittest.mock import patch

import pytest
from pyproj import CRS

from nextgisweb.env import DBSession

from nextgisweb.core.exception import ValidationError
from nextgisweb.point_cloud import PointCloudLayer
from nextgisweb.point_cloud.model import POINT_BUDGET_DEFAULT, POINT_BUDGET_MAX
from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.resource.test import ResourceAPI
from nextgisweb.spatial_ref_sys import SRS

from ..validation import FileCRS, find_srs_candidates, inspect_copc, resolve_srs

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

MERCATOR_MAX = 20037508.342789244


class _FakePointFormat:
    def __init__(self, id):
        self.id = id


class _FakeHeader:
    def __init__(self, *, point_format_id, mins, maxs, crs):
        self.point_format = _FakePointFormat(point_format_id)
        self.point_count = 42
        self.mins = mins
        self.maxs = maxs
        self._crs = crs

    def parse_crs(self):
        return self._crs


class _FakeReader:
    def __init__(self, header, npoints):
        self.header = header
        self._npoints = npoints

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        pass

    def query(self, *, level):
        assert level == 0
        return [None] * self._npoints


def fake_copc(
    *,
    point_format_id=7,
    mins=(0.0, 0.0, 3.0),
    maxs=(MERCATOR_MAX, MERCATOR_MAX, 6.0),
    crs=CRS.from_epsg(3857),
    npoints=1,
):
    header = _FakeHeader(point_format_id=point_format_id, mins=mins, maxs=maxs, crs=crs)
    return patch(
        "nextgisweb.point_cloud.validation.CopcReader.open",
        return_value=_FakeReader(header, npoints),
    )


def test_inspect(ngw_txn):
    with fake_copc():
        info = inspect_copc(Path("test.copc.laz"))

    assert info.crs is not None
    assert info.crs.auth == "EPSG:3857"
    assert info.crs.vertical_auth is None
    assert info.point_count == 42
    assert info.point_format_id == 7
    assert info.has_rgb is True


def test_inspect_compound_crs(ngw_txn):
    with fake_copc(crs=CRS.from_user_input("EPSG:3857+5773")):
        info = inspect_copc(Path("test.copc.laz"))

    assert info.crs is not None
    assert info.crs.auth == "EPSG:3857"
    assert info.crs.vertical_auth == "EPSG:5773"
    assert [srs.id for srs in find_srs_candidates(info.crs)] == [3857]


@pytest.fixture
def srs_without_authority(ngw_txn):
    # Coordinate system added from WKT has no authority fields set
    srs = SRS(
        wkt=CRS.from_epsg(32637).to_wkt("WKT1_GDAL"),
        display_name="WGS 84 / UTM zone 37N",
    ).persist()
    DBSession.flush()
    assert srs.auth_name is None and srs.auth_srid is None
    return srs


@pytest.mark.parametrize("crs_input", ["EPSG:32637", "EPSG:32637+5773"])
def test_candidates_without_authority(crs_input, srs_without_authority):
    crs = FileCRS.from_crs(CRS.from_user_input(crs_input))
    assert find_srs_candidates(crs) == [srs_without_authority]


def test_candidates_none(ngw_txn):
    crs = FileCRS.from_crs(CRS.from_epsg(32637))
    assert find_srs_candidates(crs) == []


@pytest.mark.parametrize(
    "crs_input, srs_id, message",
    [
        pytest.param("EPSG:3857", 3857, None, id="specified"),
        pytest.param("EPSG:3857", None, None, id="auto"),
        pytest.param("EPSG:3857", 4326, "does not match", id="mismatch"),
        pytest.param(None, 4326, None, id="manual"),
        pytest.param(None, None, "Specify it manually", id="no-crs"),
        pytest.param("EPSG:32637", None, "EPSG:32637", id="unregistered"),
    ],
)
def test_resolve_srs(crs_input, srs_id, message, ngw_txn):
    crs = FileCRS.from_crs(CRS.from_user_input(crs_input)) if crs_input else None
    srs = SRS.filter_by(id=srs_id).one() if srs_id else None

    if message is None:
        assert resolve_srs(crs, srs).id == (srs_id or 3857)
    else:
        with pytest.raises(ValidationError, match=message):
            resolve_srs(crs, srs)


def test_resolve_srs_several(srs_without_authority):
    # Same coordinate system registered twice
    SRS(wkt=srs_without_authority.wkt, display_name="Duplicate").persist()
    DBSession.flush()

    crs = FileCRS.from_crs(CRS.from_epsg(32637))
    with pytest.raises(ValidationError, match="Several"):
        resolve_srs(crs, None)
    assert resolve_srs(crs, srs_without_authority) == srs_without_authority


@pytest.mark.parametrize(
    "kwargs, message",
    [
        pytest.param(dict(point_format_id=3), "point formats", id="pdrf"),
        pytest.param(dict(npoints=0), "hierarchy", id="empty"),
    ],
)
def test_inspect_invalid(kwargs, message, ngw_txn):
    with fake_copc(**kwargs):
        with pytest.raises(ValidationError, match=message):
            inspect_copc(Path("test.copc.laz"))


def test_inspect_not_copc(tmp_path: Path):
    source = tmp_path / "source.copc.laz"
    source.write_bytes(b"copc")

    with pytest.raises(ValidationError, match="Invalid COPC"):
        inspect_copc(source)


@pytest.fixture
def source_upload(ngw_file_upload, tmp_path: Path):
    source = tmp_path / "source.copc.laz"
    source.write_bytes(b"copc-content")
    return ngw_file_upload(source)


def create_layer(source_upload, parent, *, srs_id=None, status=None):
    body = {"source": source_upload}
    if srs_id is not None:
        body["srs"] = {"id": srs_id}
    payload = {"resource": {"parent": {"id": parent}}, "point_cloud_layer": body}
    if status is None:
        return ResourceAPI().create("point_cloud_layer", payload)
    return ResourceAPI().create_request("point_cloud_layer", payload, status=status)


@pytest.fixture
def layer_id(source_upload, ngw_resource_group):
    with fake_copc():
        yield create_layer(source_upload, ngw_resource_group)


@pytest.fixture
def layer_without_crs_id(source_upload, ngw_resource_group):
    with fake_copc(crs=None):
        yield create_layer(source_upload, ngw_resource_group, srs_id=3857)


def test_inspect_endpoint(source_upload, ngw_webtest_app: WebTestApp):
    with fake_copc(crs=CRS.from_user_input("EPSG:3857+5773")):
        resp = ngw_webtest_app.post(
            "/api/component/point_cloud/inspect",
            json=source_upload,
            status=200,
        ).json

    assert resp["crs"]["auth"] == "EPSG:3857"
    assert resp["crs"]["vertical_auth"] == "EPSG:5773"
    assert [c["id"] for c in resp["srs_candidates"]] == [3857]
    assert resp["point_count"] == 42


@pytest.mark.parametrize(
    "crs, auth",
    [
        pytest.param(CRS.from_epsg(32637), "EPSG:32637", id="unregistered"),
        pytest.param(None, None, id="no-crs"),
    ],
)
def test_inspect_endpoint_no_candidates(crs, auth, source_upload, ngw_webtest_app: WebTestApp):
    with fake_copc(crs=crs):
        resp = ngw_webtest_app.post(
            "/api/component/point_cloud/inspect",
            json=source_upload,
            status=200,
        ).json

    assert (resp["crs"] and resp["crs"]["auth"]) == auth
    assert resp["srs_candidates"] == []


def test_layer_inspect_endpoint(layer_id, ngw_webtest_app: WebTestApp):
    resp = ngw_webtest_app.get(f"/api/resource/{layer_id}/point_cloud/inspect", status=200).json
    assert resp["crs"]["auth"] == "EPSG:3857"
    assert [c["id"] for c in resp["srs_candidates"]] == [3857]
    assert resp["point_count"] == 42


def test_create(layer_id, ngw_webtest_app: WebTestApp):
    resp = ngw_webtest_app.get(f"/api/resource/{layer_id}", status=200)
    data = resp.json["point_cloud_layer"]
    assert data["srs"]["id"] == 3857
    assert data["point_format_id"] == 7
    assert data["has_rgb"] is True
    assert data["srs_proj4"]


def test_create_without_source(ngw_resource_group):
    ResourceAPI().create_request(
        "point_cloud_layer",
        {
            "resource": {"parent": {"id": ngw_resource_group}},
            "point_cloud_layer": {},
        },
        status=422,
    )


def test_create_srs_mismatch(source_upload, ngw_resource_group):
    with fake_copc():
        create_layer(source_upload, ngw_resource_group, srs_id=4326, status=422)


def test_create_without_crs(source_upload, ngw_resource_group):
    with fake_copc(crs=None):
        create_layer(source_upload, ngw_resource_group, status=422)


def test_srs_update(layer_id):
    # SRS is validated against the stored file
    api = ResourceAPI()
    api.update_request(layer_id, {"point_cloud_layer": {"srs": {"id": 4326}}}, status=422)
    assert api.read(layer_id)["point_cloud_layer"]["srs"]["id"] == 3857


def test_srs_update_without_crs(layer_without_crs_id):
    # Any SRS can be specified for a file without coordinate system
    api = ResourceAPI()
    api.update(layer_without_crs_id, {"point_cloud_layer": {"srs": {"id": 4326}}})
    assert api.read(layer_without_crs_id)["point_cloud_layer"]["srs"]["id"] == 4326


def test_extent(ngw_txn):
    layer = PointCloudLayer(
        srs=SRS.filter_by(id=3857).one(),
        minx=0.0,
        miny=0.0,
        maxx=MERCATOR_MAX,
        maxy=MERCATOR_MAX,
    )

    extent = layer.extent

    assert extent["minLon"] == pytest.approx(0.0, abs=1e-6)
    assert extent["minLat"] == pytest.approx(0.0, abs=1e-6)
    assert extent["maxLon"] == pytest.approx(180.0, abs=1e-6)
    assert extent["maxLat"] == pytest.approx(85.05112878, abs=1e-6)


def test_content_range(layer_id, ngw_webtest_app: WebTestApp):
    url = f"/api/resource/{layer_id}/point_cloud.copc.laz"

    head = ngw_webtest_app.head(url, status=200)
    assert head.headers["Accept-Ranges"] == "bytes"

    response = ngw_webtest_app.get(url, headers={"Range": "bytes=0-3"}, status=206)
    assert response.body == b"copc"


def test_copc_external_access(layer_id, ngw_webtest_app: WebTestApp):
    # QGIS recognizes COPC by the file name in the URL path
    url = f"/api/resource/{layer_id}/point_cloud.copc.laz"
    page = ngw_webtest_app.get(f"/resource/{layer_id}", status=200)
    assert url in page.text


def test_style_parent_and_value(layer_id, ngw_resource_group):
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
            "resource": {"parent": {"id": layer_id}},
            "point_cloud_style": {"value": style_value},
        },
    )

    data = ResourceAPI().read(style_id)
    assert data["point_cloud_style"]["value"]["mode"] == "classification"

    ResourceAPI().create_request(
        "point_cloud_style",
        {
            "resource": {"parent": {"id": ngw_resource_group}},
            "point_cloud_style": {"value": style_value},
        },
        status=422,
    )


def test_point_budget(layer_id, ngw_webtest_app: WebTestApp):
    settings = ngw_webtest_app.get(
        "/api/component/pyramid/settings", query={"component": "point_cloud"}
    ).json
    assert settings["pointBudget"]["default"] == POINT_BUDGET_DEFAULT

    def payload(**style):
        return {"resource": {"parent": {"id": layer_id}}, "point_cloud_style": style}

    style_id = ResourceAPI().create("point_cloud_style", payload())
    value = ResourceAPI().read(style_id)["point_cloud_style"]["value"]
    assert value["point_budget"] == POINT_BUDGET_DEFAULT

    value["point_budget"] = POINT_BUDGET_MAX + 1
    ResourceAPI().create_request("point_cloud_style", payload(value=value), status=422)
