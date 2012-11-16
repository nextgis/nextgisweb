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

@view_config(route_name='webmap.show', renderer='obj.mako')
@model_loader(WebMap)
def show(request, obj):
    return dict(obj=obj)


@view_config(route_name='webmap.display', renderer='webmap/display.mako')
@model_loader(WebMap)
def display(request, obj):
    return dict(
        obj=obj,
        root_layer_group=DBSession.query(LayerGroup).filter_by(id=0).one(),
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
