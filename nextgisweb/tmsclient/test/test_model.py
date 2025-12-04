from io import BytesIO

import numpy as np
import pytest
import transaction
from PIL import Image, ImageDraw
from pyramid.response import Response

from nextgisweb.spatial_ref_sys.model import BOUNDS_EPSG_3857, SRS

from ..model import Connection, Layer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


def image_compare(im1, im2):
    arr1 = np.asarray(im1, np.float32)
    arr2 = np.asarray(im2, np.float32)
    return np.array_equal(arr1, arr2)


def tms_server(request):
    z, x, y = (int(request.GET[c]) for c in ("z", "x", "y"))
    assert request.GET.get("layer") == "ngw"
    assert request.GET.get("apikey") == "test-apikey"
    assert request.GET.get("custom") == "custom"

    img = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.text((8, 8), f"{z} / {x} / {y}", (255, 0, 0))
    buf = BytesIO()
    img.save(buf, "png")
    buf.seek(0)
    return Response(body_file=buf, content_type="image/png")


@pytest.fixture
def connection(ngw_httptest_app, webapp_handler):
    with transaction.manager:
        resource = Connection(
            url_template="%s/test/request/?layer={layer}&z={z}&x={x}&y={y}&custom=custom"
            % ngw_httptest_app.base_url,
            apikey="test-apikey",
        ).persist()

    with webapp_handler(tms_server):
        yield resource.id


@pytest.fixture
def layer(connection):
    with transaction.manager:
        resource = Layer(
            connection_id=connection,
            layer_name="ngw",
            minzoom=0,
            maxzoom=3,
        ).persist()

    return resource.id


def test_layer(layer, ngw_webtest_app, ngw_resource_group):
    ngw_webtest_app.get(f"/api/component/render/tile?z={4}&x=0&y=0&resource={layer}", status=422)

    res = Layer.filter_by(id=layer).one()
    srs = SRS.filter_by(id=3857).one()
    req = res.render_request(srs)

    image1 = req.render_tile((0, 0, 0), 256)
    image2 = req.render_extent(BOUNDS_EPSG_3857, (256, 256))
    assert image_compare(image1, image2)

    image1 = req.render_tile((1, 0, 0), 256)
    image2 = req.render_extent(BOUNDS_EPSG_3857, (512, 512))

    assert image_compare(image1, image2.crop((0, 0, 256, 256)))
