# -*- coding: utf-8 -*-
from collections import namedtuple
from bunch import Bunch

from ..models import DBSession

from ..object_widget import ObjectWidget
from ..views import ModelController, model_loader, permalinker
from ..psection import PageSections
from .. import dynmenu as dm


from .plugin import WebmapPlugin


class WebmapObjectWidget(ObjectWidget):

    def populate_obj(self):
        super(WebmapObjectWidget, self).populate_obj()

        self.obj.from_dict(self.data)

    def validate(self):
        result = super(WebmapObjectWidget, self).validate()
        self.error = []

        return result

    def widget_params(self):
        result = super(WebmapObjectWidget, self).widget_params()

        if self.obj:
            result['value'] = self.obj.to_dict()

        return result

    def widget_module(self):
        return 'webmap/Widget'


def setup_pyramid(comp, config):
    WebMap = comp.WebMap
    ACLController = comp.env.security.ACLController

    permalinker(WebMap, "webmap.show")

    class WebmapController(ModelController):
        def create_context(self, request):
            request.require_permission(WebMap.acl_root, 'write')

            return dict(
                owner_user=request.user,
                template_context=dict(subtitle=u"Новая веб-карта")
            )

        def edit_context(self, request):
            obj = DBSession.query(WebMap).filter_by(**request.matchdict).one()
            request.require_permission(obj, 'write')

            return dict(
                obj=obj,
                template_context=dict(obj=obj),
            )

        def widget_class(self, context, operation):
            return WebmapObjectWidget

        def create_object(self, context):
            return WebMap(
                owner_user=context['owner_user'],
                root_item=comp.WebMapItem(item_type='root'),
            )

        def query_object(self, context):
            return context['obj']

        def template_context(self, context):
            return context['template_context']

    WebmapController('webmap').includeme(config)

    ACLController(WebMap).includeme(config)

    @model_loader(WebMap)
    def show(request, obj):
        request.require_permission(obj, 'read')
        return dict(
            obj=obj,
            sections=WebMap.__psections__,
        )

    config.add_route('webmap.show', '/webmap/{id:\d+}') \
        .add_view(show, renderer='psection.mako')

    def browse(request):
        request.require_permission(WebMap.acl_root, 'read')
        obj_list = DBSession.query(WebMap)

        return dict(
            obj_list=obj_list,
            dynmenu=request.env.webmap.WebMap.__dynmenu__,
            dynmenu_kwargs=Bunch(request=request),
        )

    config.add_route('webmap.browse', '/webmap/') \
        .add_view(browse, renderer='webmap/browse.mako')

    class WebMapMenu(dm.DynItem):

        def build(self, kwargs):
            yield dm.Link(
                'create', u"Создать",
                lambda kwargs: kwargs.request.route_url('webmap.create')
            )

            if 'obj' in kwargs:
                yield dm.Link(
                    'edit', u"Редактировать",
                    lambda kwargs: kwargs.request.route_url(
                        'webmap.edit',
                        id=kwargs.obj.id
                    )
                )

                yield dm.Link(
                    'display', u"Открыть",
                    lambda kwargs: kwargs.request.route_url(
                        'webmap.display',
                        id=kwargs.obj.id
                    )
                )

                yield dm.Link(
                    'acl', u"Управление доступом",
                    lambda args: args.request.route_url(
                        'webmap.acl', id=args.obj.id
                    )
                )

    @model_loader(WebMap)
    def display(request, obj):
        request.require_permission(obj, 'read')

        MID = namedtuple('MID', ['adapter', 'basemap', 'plugin'])

        display.mid = MID(
            set(),
            set(),
            set(),
        )

        def traverse(item):
            data = dict(
                id=item.id,
                type=item.item_type,
                label=item.display_name
            )

            if item.item_type == 'layer':
                style = item.style
                layer = style.layer

                # При отсутствии необходимых прав пропускаем элемент веб-карты,
                # таким образом он просто не будет показан при отображении и
                # в дереве слоев
                if not layer.has_permission(
                    request.user,
                    'style-read',
                    'data-read',
                ):
                    return None

                # Основные параметры элемента
                data.update(
                    layerId=style.layer_id,
                    styleId=style.id,
                    visibility=bool(item.layer_enabled),
                    minScaleDenom=item.layer_min_scale_denom,
                    maxScaleDenom=item.layer_max_scale_denom,
                )

                # Адаптер слоя пока один
                data.update(adapter="webmap/TMSAdapter")
                display.mid.adapter.add(data['adapter'])

                # Плагины уровня слоя
                plugin = dict()
                for pcls in WebmapPlugin.registry:
                    p_mid_data = pcls.is_layer_supported(layer, obj)
                    if p_mid_data:
                        plugin.update((p_mid_data, ))

                data.update(plugin=plugin)
                display.mid.plugin.update(plugin.keys())

            elif item.item_type in ('root', 'group'):
                # Рекурсивно пробегаем по всем элементам, исключая те,
                # на которые нет необходимых прав доступа
                data.update(children=filter(
                    None,
                    map(traverse, item.children)
                ))

            return data

        tmp = obj.to_dict()

        config = dict(
            extent=tmp["extent"],
            rootItem=traverse(obj.root_item),
            mid=dict(
                adapter=tuple(display.mid.adapter),
                basemap=tuple(display.mid.basemap),
                plugin=tuple(display.mid.plugin)
            ),
            bookmarkLayerId=obj.bookmark_layer_id,
        )

        return dict(
            obj=obj,
            display_config=config,
            custom_layout=True
        )

    config.add_route('webmap.display', '/webmap/{id:\d+}/display') \
        .add_view(display, renderer='webmap/display.mako')

    comp.WebMap.__dynmenu__ = WebMapMenu()

    WebMap.__psections__ = PageSections()

    WebMap.__psections__.register(
        key='permissions',
        priority=90,
        title=u"Права пользователя",
        template="security/section_resource_permissions.mako"
    )
