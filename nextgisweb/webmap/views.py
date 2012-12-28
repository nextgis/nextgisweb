# -*- coding: utf-8 -*-
from pyramid.view import view_config

from ..models import DBSession
from .models import WebMap

from ..layer_group import LayerGroup

from ..views import model_loader

@view_config(route_name='webmap.browse', renderer='webmap/browse.mako')
def browse(request):
    obj_list = DBSession.query(WebMap)
    return dict(
        obj_list=obj_list
    )

@view_config(route_name='webmap.show', renderer='webmap/show.mako')
@model_loader(WebMap)
def show(request, obj):
    return dict(obj=obj)


@view_config(route_name='webmap.display', renderer='webmap/display.mako')
@model_loader(WebMap)
def display(request, obj):

    # подготовим список и дерево слоев
    display.idx = 1
    def traverse(item):
        display.idx += 1
        result = dict(
            id=display.idx,
            item_type=item.item_type,
            display_name=item.display_name
        )
        children = []
        layers = []

        if item.item_type == 'group':
            result['group_expanded'] = item.group_expanded
        elif item.item_type == 'layer':
            result['layer_style_id'] = item.layer_style_id
            result['layer_enabled'] = item.layer_enabled
            result['checked'] = item.layer_enabled
            layers.append(result)

        for i in item.children:
            c, l = traverse(i)
            children.append(c)
            layers.extend(l)

        if item.item_type in ('group', 'root'):
            result['children'] = children

        return (result, layers)

    tree_config, layer_config = traverse(obj.root_item)

    return dict(
        obj=obj,
        adapters=(('tms', 'webmap/TMSAdapter'), ),
        layer_config=layer_config,
        tree_config=tree_config,
        root_layer_group=DBSession.query(LayerGroup).filter_by(id=0).one(),
        custom_layout=True
    )


@view_config(route_name='webmap.layer_hierarchy', renderer='json')
@model_loader(WebMap)
def layer_hierarchy(request, obj):
    def children(parent):
        result = []
        for i in parent.children:
            result.append(dict(id='G-%d' % i.id, type='parent', layer_group_id=i.id, display_name=i.display_name, children=children(i)))

        for i in parent.layers:
            layer_info = dict(id='L-%d' % i.id, type='parent', layer_id=i.id, display_name=i.display_name, checked=False)
            layer_info['style_id'] = i.styles[0].id if len(i.styles) > 0 else None
            result.append(layer_info)

        return result

    return dict(
        identifier='id',
        label='display_name',
        items=children(DBSession.query(LayerGroup).filter_by(id=0).one())
    )


@view_config(route_name='api.webmap.item.retrive', renderer='json')
@model_loader(WebMap)
def api_webmap_item_retrive(request, obj):
    return obj.to_dict()


@view_config(route_name='api.webmap.item.replace', renderer='json')
@model_loader(WebMap)
def api_webmap_item_replace(request, obj):
    obj.from_dict(request.json_body)