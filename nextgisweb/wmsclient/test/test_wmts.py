from io import BytesIO
from pathlib import Path

import pytest
import transaction
from PIL import Image, ImageStat

from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.raster_layer import RasterLayer
from nextgisweb.raster_layer import test as raster_layer_test
from nextgisweb.raster_style import RasterStyle
from nextgisweb.wmsserver import Layer as WMSServiceLayer
from nextgisweb.wmsserver import Service as WMSService

from .. import WMSConnection, WMSLayer

data_raster_layer = Path(raster_layer_test.__file__).parent / "data"

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def wms_service_path(ngw_httptest_factory):
    with transaction.manager:
        layer = RasterLayer().persist()
        layer.load_file(data_raster_layer / "rounds.tif", cog=True)

        style = RasterStyle(parent=layer).persist()

        service = WMSService(
            layers=[
                WMSServiceLayer(
                    resource=style,
                    keyname="rounds",
                    display_name="rounds",
                ),
            ]
        ).persist()

    with ngw_httptest_factory() as app:
        path = "{}/api/resource/{}/wms".format(app.base_url, service.id)
        yield path


@pytest.fixture(scope="module")
def connection_id(wms_service_path):
    with transaction.manager:
        res = WMSConnection(
            url=wms_service_path,
            username="administrator",
            password="admin",
            version="wmts-1.0.0",
        ).persist()
        res.capcache_query()
    yield res.id


@pytest.fixture(scope="module")
def layer_id(connection_id):
    with transaction.manager:
        res = WMSLayer(
            connection_id=connection_id,
            wmslayers="rounds",
            imgformat="image/png",
            remote_srs_id=3857,
        ).persist()
    yield res.id


@pytest.mark.parametrize(
    "coord, color",
    (
        pytest.param((6, 32, 20), (255, 0, 0, 255), id="tile-red"),
        pytest.param((6, 40, 22), (0, 255, 0, 255), id="tile-green"),
        pytest.param((6, 32, 26), (0, 0, 255, 255), id="tile-blue"),
        pytest.param((6, 40, 26), (0, 0, 0, 255), id="tile-black"),
        pytest.param((251440, 5977974, 1978853, 7505647), (255, 0, 0, 255), id="extent-red"),
        pytest.param((3848936, 5977974, 5503915, 7505647), (0, 255, 0, 255), id="extent-green"),
        pytest.param((251440, 2556073, 1978853, 4158374), (0, 0, 255, 255), id="extent-blue"),
        pytest.param((3848936, 2556073, 5503915, 4158374), (0, 0, 0, 255), id="extent-black"),
        pytest.param((0, 0, 0.001, 0.001), None, id="overzoom"),
    ),
)
def test_wmts_layer(coord, color, layer_id, ngw_webtest_app: WebTestApp):
    query = {"resource": layer_id, "nd": 204}
    if len(coord) == 3:
        url = "/api/component/render/tile"
        z, x, y = coord
        query["z"], query["x"], query["y"] = z, x, y
    else:
        url = "/api/component/render/image"
        query["extent"] = ",".join(map(str, coord))
        query["size"] = "256,256"

    status = 200 if color is not None else 204
    resp = ngw_webtest_app.get(url, query=query, status=status)
    if color is not None:
        img = Image.open(BytesIO(resp.body))
        assert _color(img) == color


def _color(img, tolerance=None):
    extrema = ImageStat.Stat(img).extrema
    for b in extrema:
        if (b[0] != b[1]) if tolerance is None else (abs(b[0] - b[1]) > tolerance):
            return None
    return tuple(b[0] for b in extrema)
