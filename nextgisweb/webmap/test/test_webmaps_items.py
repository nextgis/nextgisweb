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


def _fill_fake_attrs(items, title=None):
    if title is None:
        title = []
    for i, item in enumerate(items, start=1):
        subtitle = title + [str(i)]
        t = item["item_type"]
        item["display_name"] = f"{t}|{'-'.join(subtitle)}"
        if t == "layer":
            item["layer_style_id"] = 0
            item["layer_adapter"] = "image"
        if "children" in item:
            _fill_fake_attrs(item["children"], subtitle)


def _check_expected_enabled(item, expected, path=None):
    if path is None:
        path = []

    for i, child in enumerate(item.children, start=1):
        subpath = path + [i]
        if child.item_type == "layer" and child.layer_enabled:
            assert subpath in expected, f"Layer item '{child.display_name}' shouldn't be enabled"
            expected.remove(subpath)
        elif child.item_type == "group":
            _check_expected_enabled(child, expected, subpath)


@pytest.mark.parametrize(
    "items, expected",
    (
        (
            [
                dict(
                    item_type="group",
                    group_exclusive=True,
                    children=[
                        dict(item_type="layer", layer_enabled=False),
                        dict(item_type="layer", layer_enabled=True),
                        dict(item_type="layer", layer_enabled=True),
                    ],
                )
            ],
            [[1, 2]],
        ),
        (
            [
                dict(
                    item_type="group",
                    group_exclusive=False,
                    children=[
                        dict(item_type="layer", layer_enabled=True),
                        dict(item_type="layer", layer_enabled=False),
                        dict(item_type="layer", layer_enabled=True),
                    ],
                )
            ],
            [[1, 1], [1, 3]],
        ),
        (
            [
                dict(item_type="layer", layer_enabled=False),
                dict(
                    item_type="group",
                    group_exclusive=True,
                    children=[
                        dict(item_type="layer", layer_enabled=False),
                        dict(
                            item_type="group",
                            children=[
                                dict(item_type="layer", layer_enabled=True),
                                dict(
                                    item_type="group",
                                    children=[
                                        dict(item_type="layer", layer_enabled=True),
                                    ],
                                ),
                            ],
                        ),
                        dict(item_type="layer", layer_enabled=True),
                    ],
                ),
                dict(item_type="layer", layer_enabled=True),
            ],
            [[2, 2, 1], [2, 2, 2, 1], [3]],
        ),
        (
            [
                dict(
                    item_type="group",
                    group_exclusive=True,
                    children=[
                        dict(
                            item_type="group",
                            children=[
                                dict(item_type="layer", layer_enabled=True),
                                dict(item_type="layer", layer_enabled=True),
                            ],
                        ),
                        dict(item_type="layer", layer_enabled=True),
                    ],
                ),
            ],
            [[1, 1, 1], [1, 1, 2]],
        ),
        (
            [
                dict(
                    item_type="group",
                    group_exclusive=True,
                    children=[
                        dict(item_type="layer", layer_enabled=True),
                        dict(item_type="group", children=[]),
                        dict(
                            item_type="group",
                            children=[
                                dict(item_type="layer", layer_enabled=True),
                                dict(item_type="layer", layer_enabled=True),
                            ],
                        ),
                    ],
                ),
            ],
            [[1, 1]],
        ),
    ),
)
def test_exclusive(items, expected):
    _fill_fake_attrs(items)

    root = WebMap().root_item
    root_struct = convert(dict(item_type="root", children=items), WebMapItemRootWrite)
    root_struct.to_model(root)

    _check_expected_enabled(root, expected)
    assert len(expected) == 0, "Not all enabled layer items found"
