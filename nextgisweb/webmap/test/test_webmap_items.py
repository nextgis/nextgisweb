import pytest
import transaction
from msgspec import convert

from nextgisweb.env import DBSession

from nextgisweb.raster_layer import RasterLayer
from nextgisweb.raster_style import RasterStyle

from .. import WebMap
from ..model import WebMapItemRootWrite
from ..util import webmap_items_to_tms_ids_list

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults")


def make_webmap_item_layer(layer_style):
    layer_id, style_id, draw_order_position = layer_style
    return {
        "item_type": "layer",
        "display_name": str(style_id),
        "layer_style_id": style_id,
        "layer_adapter": "image",
        "draw_order_position": draw_order_position,
    }


count_layers_created = 6


def make_webmap_items(layers_styles):
    layers_styles_sort = sorted(layers_styles, key=lambda ls: ls[1])

    dict_items = {
        "item_type": "root",
        "children": [
            make_webmap_item_layer(layers_styles_sort[0]),
            {
                "item_type": "group",
                "display_name": "Group 1",
                "children": [make_webmap_item_layer(ls) for ls in layers_styles_sort[1:3]],
            },
            {
                "item_type": "group",
                "display_name": "Group 2",
                "children": [make_webmap_item_layer(ls) for ls in layers_styles_sort[3:5]],
            },
            make_webmap_item_layer(layers_styles_sort[5]),
        ],
    }

    return dict_items


def make_layer_style(num):
    layer = RasterLayer(xsize=100, ysize=100, dtype="Byte", band_count=3).persist()
    style = RasterStyle(parent=layer).persist()

    DBSession.flush()
    return layer.id, style.id


@pytest.fixture(scope="module")
def fixt_layers_styles(ngw_env, ngw_resource_group):
    layers_styles_ = []

    with transaction.manager:
        for i in range(count_layers_created):
            layer_id, style_id = make_layer_style(i)
            draw_order_position = count_layers_created - i
            layers_styles_.append((layer_id, style_id, draw_order_position))

    yield layers_styles_


@pytest.fixture(scope="module")
def webmap_with_items(fixt_layers_styles):
    with transaction.manager:
        webmap = WebMap()
        root_item_struct = convert(make_webmap_items(fixt_layers_styles), WebMapItemRootWrite)
        root_item_struct.to_model(webmap.root_item)
        webmap.persist()

    yield webmap, fixt_layers_styles


def test_count_tms_ids_should_equals_webmap_items_count(webmap_with_items):
    webmap, fixt_layers_styles = webmap_with_items
    with transaction.manager:
        webmap = WebMap.filter_by(id=webmap.id).one()
        ids = webmap_items_to_tms_ids_list(webmap)
    assert len(ids) == count_layers_created


def test_default_order_tms_ids_should_match_the_reversed_order_webmap_items(webmap_with_items):
    webmap, fixt_layers_styles = webmap_with_items
    with transaction.manager:
        webmap = WebMap.filter_by(id=webmap.id).one()
        ids = webmap_items_to_tms_ids_list(webmap)

    assert ids == sorted(map(lambda ls: ls[1], fixt_layers_styles), reverse=True)


def test_order_tms_ids_should_consider_the_draw_order_enabled(webmap_with_items):
    webmap, fixt_layers_styles = webmap_with_items
    with transaction.manager:
        webmap = WebMap.filter_by(id=webmap.id).one()
        webmap.draw_order_enabled = True
        ids = webmap_items_to_tms_ids_list(webmap)

    # sort expected styles by draw_order_position
    fixt_layers_styles = sorted(fixt_layers_styles, key=lambda ls: ls[2], reverse=True)

    assert ids == list(map(lambda ls: ls[1], fixt_layers_styles))

    with transaction.manager:
        webmap = WebMap.filter_by(id=webmap.id).one()
        webmap.draw_order_enabled = False
        DBSession.flush()


@pytest.mark.parametrize(
    "exclusive,data",
    (
        pytest.param(
            False,
            [
                {
                    "item_type": "layer",
                    "display_name_expected": "1",
                    "layer_enabled": True,
                    "layer_enabled_expected": True,
                },
                {
                    "item_type": "layer",
                    "display_name_expected": "2",
                    "layer_enabled": False,
                    "layer_enabled_expected": False,
                },
                {
                    "item_type": "group",
                    "display_name_expected": "3",
                    "group_enabled": True,
                    "group_enabled_expected": True,
                },
                {
                    "item_type": "group",
                    "display_name_expected": "4",
                    "group_enabled": False,
                    "group_enabled_expected": False,
                    "children": [
                        {
                            "item_type": "layer",
                            "display_name_expected": "4.1",
                            "layer_enabled": True,
                            "layer_enabled_expected": True,
                        },
                    ],
                },
            ],
            id="regular-multiple",
        ),
        pytest.param(
            True,
            [
                {
                    "item_type": "layer",
                    "layer_enabled": True,
                    "layer_enabled_expected": True,
                },
                {
                    "item_type": "layer",
                    "layer_enabled": False,
                    "layer_enabled_expected": False,
                },
                {
                    "item_type": "group",
                    "group_enabled": True,
                    "group_enabled_expected": False,
                },
                {
                    "item_type": "group",
                    "group_enabled": True,
                    "group_enabled_expected": False,
                },
            ],
            id="exclusive-multiple",
        ),
        pytest.param(
            True,
            [
                {
                    "item_type": "layer",
                    "layer_enabled": False,
                    "layer_enabled_expected": False,
                },
                {
                    "item_type": "layer",
                    "layer_enabled": False,
                    "layer_enabled_expected": False,
                },
                {
                    "item_type": "group",
                    "group_enabled": False,
                    "group_enabled_expected": False,
                },
                {
                    "item_type": "group",
                    "group_enabled": False,
                    "group_enabled_expected": False,
                },
            ],
            id="exclusive-none",
        ),
    ),
)
def test_exclusive(exclusive, data):
    def _fill_data(items, path=()):
        for i, child in enumerate(items, start=1):
            child["display_name"] = ".".join(map(str, (*path, i)))
            if child["item_type"] == "layer":
                child["layer_style_id"] = 0
                child["layer_adapter"] = "image"
            if "children" in child:
                _fill_data(child["children"], (*path, i))

    _fill_data(data)

    group = {
        "item_type": "group",
        "display_name": "group",
        "group_exclusive": exclusive,
        "children": data,
    }

    root = WebMap().root_item
    convert(
        {"item_type": "root", "children": [group]},
        WebMapItemRootWrite,
    ).to_model(root)

    def _validate(node, data, path=()):
        assert node.item_type == data["item_type"]
        checks = 0
        for k, v in data.items():
            if k.endswith("_expected"):
                n = k.removesuffix("_expected")
                assert getattr(node, n) == v
                checks += 1
        assert len(path) <= 1 or checks > 0

        if node.item_type in ("root", "group"):
            data_children = data.get("children", ())
            assert len(node.children) == len(data_children)
            for i, (child, child_data) in enumerate(zip(node.children, data_children)):
                _validate(child, child_data, (*path, i + 1))

    _validate(root.children[0], group)
