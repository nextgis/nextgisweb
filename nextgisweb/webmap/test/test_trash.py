import pytest
import transaction

from nextgisweb.raster_layer import RasterLayer
from nextgisweb.raster_style import RasterStyle
from nextgisweb.resource.test import ResourceAPI

from .. import WebMap, WebMapItem

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture
def styles():
    with transaction.manager:
        rlayer = RasterLayer(xsize=100, ysize=100, dtype="Byte", band_count=3).persist()
        rstyle_1 = RasterStyle(parent=rlayer).persist()
        rstyle_2 = RasterStyle(parent=rlayer).persist()
    yield rstyle_1.id, rstyle_2.id


@pytest.fixture
def webmap(styles):
    style_1, style_2 = styles
    with transaction.manager:
        obj = WebMap(
            root_item=WebMapItem(
                item_type="root",
                children=[
                    WebMapItem(item_type="layer", layer_style_id=style_1),
                    WebMapItem(item_type="layer", layer_style_id=style_2),
                ],
            ),
        ).persist()
    yield obj.id


def test_trash(webmap, styles):
    style_1, style_2 = styles
    rapi = ResourceAPI()
    rapi.delete(style_1, query=dict(soft=True))

    data = rapi.read(webmap)
    items = data["webmap"]["root_item"]["children"]
    assert len(items) == 1
    assert items[0]["layer_style_id"] == style_2
