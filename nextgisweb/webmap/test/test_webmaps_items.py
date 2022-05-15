import pytest
import transaction

from nextgisweb.auth import User
from nextgisweb.models import DBSession
from nextgisweb.raster_layer import RasterLayer
from nextgisweb.raster_style import RasterStyle
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.webmap import WebMap, WebMapItem
from nextgisweb.webmap.util import webmap_items_to_tms_ids_list


def make_webmap_item_layer(layer_style):
    layer_id, style_id, draw_order_position = layer_style
    return {
        "item_type": "layer",
        "layer_style_id": style_id,
        "draw_order_position": draw_order_position
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
                "children": map(lambda ls: make_webmap_item_layer(ls), layers_styles_sort[1:3])
            },
            {
                "item_type": "group",
                "children": map(lambda ls: make_webmap_item_layer(ls), layers_styles_sort[3:5])
            },
            make_webmap_item_layer(layers_styles_sort[5])
        ]
    }

    return {
        "root_item": dict_items
    }


def make_layer_style(ngw_resource_group, num):
    layer = RasterLayer(
        parent_id=ngw_resource_group, display_name=f'test-render-layer-{num}',
        owner_user=User.by_keyname('administrator'),
        srs=SRS.filter_by(id=3857).one(),
        xsize=100, ysize=100, dtype='Byte', band_count=3,
    ).persist()

    style = RasterStyle(
        parent=layer, display_name=f'test-render-style-{num}',
        owner_user=User.by_keyname('administrator'),
    ).persist()
    DBSession.flush()
    DBSession.expunge(style)

    return layer.id, style.id


@pytest.fixture(scope='module')
def fixt_layers_styles(ngw_env, ngw_resource_group):
    layers_styles_ = []

    with transaction.manager:
        for i in range(count_layers_created):
            layer_id, style_id = make_layer_style(ngw_resource_group, i)
            draw_order_position = count_layers_created - i
            layers_styles_.append((layer_id, style_id, draw_order_position))

    yield layers_styles_

    with transaction.manager:
        for layer_id, style_id, draw_order_position in layers_styles_:
            DBSession.delete(RasterStyle.filter_by(id=style_id).one())
            DBSession.delete(RasterLayer.filter_by(id=layer_id).one())


@pytest.fixture(scope='module')
def webmap_with_items(ngw_resource_group, fixt_layers_styles):
    with transaction.manager:
        webmap = WebMap(
            parent_id=ngw_resource_group, display_name=__name__,
            owner_user=User.by_keyname('administrator'),
            root_item=WebMapItem(item_type='root')
        )
        webmap.from_dict(make_webmap_items(fixt_layers_styles))
        webmap.persist()

    yield webmap, fixt_layers_styles

    with transaction.manager:
        DBSession.delete(WebMap.filter_by(id=webmap.id).one())


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
