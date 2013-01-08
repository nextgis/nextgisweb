# -*- coding: utf-8 -*-
from pyramid.view import view_config

from ..models import DBSession
from .models import WebMap

from ..layer_group import LayerGroup
from ..object_widget import ObjectWidget
from ..views import ModelController, model_loader, permalinker

@view_config(route_name='webmap.browse', renderer='webmap/browse.mako')
def browse(request):
    obj_list = DBSession.query(WebMap)
    return dict(
        obj_list=obj_list
    )


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



class WebmapObjectWidget(ObjectWidget):

    def populate_obj(self):
        super(WebmapObjectWidget, self).populate_obj()

        self.obj.from_dict(self.data)

    def validate(self):
        result = super(WebmapObjectWidget, self).validate()
        self.error = [];

        return result

    def widget_params(self):
        result = super(WebmapObjectWidget, self).widget_params()

        if self.obj:
            result['value'] = self.obj.to_dict()

        return result

    def widget_module(self):
        return 'webmap/Widget'


def setup_pyramid(comp, config):

    permalinker(WebMap, "webmap.show")

    @model_loader(WebMap)
    def show(request, obj):
        return dict(obj=obj)

    config.add_route('webmap.show', '/webmap/{id}')
    config.add_view(show, route_name='webmap.show', renderer='obj.mako')

    class WebmapController(ModelController):
        def create_context(self, request):
            parent = DBSession.query(WebMap).filter_by(id=request.GET['parent_id']).one()
            template_context = dict(
                subtitle=u"Новая веб-карта",
            )
            return locals()

        def edit_context(self, request):
            obj = DBSession.query(WebMap).filter_by(**request.matchdict).one()
            template_context = dict(
                obj=obj,
            )
            return locals()

        def widget_class(self, context, operation):
            return WebmapObjectWidget

        def create_object(self, context):
            return WebMap()

        def query_object(self, context):
            return context['obj']

        def template_context(self, context):
            return context['template_context']

    WebmapController('webmap') \
        .includeme(config)
