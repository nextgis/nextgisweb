# -*- coding: utf-8 -*-
from collections import namedtuple

from ..object_widget import ObjectWidget

from ..views import model_loader

from .models import WebMap
from .plugin import WebmapPlugin
from .adapter import WebMapAdapter


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

    WebMap.object_widget = WebmapObjectWidget

    @model_loader(WebMap)
    def display(request, obj):
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
                layer = style.parent

                # При отсутствии необходимых прав пропускаем элемент веб-карты,
                # таким образом он просто не будет показан при отображении и
                # в дереве слоев
                # if not layer.has_permission(
                #     request.user,
                #     'style-read',
                #     'data-read',
                # ):
                #     return None

                # Основные параметры элемента
                data.update(
                    layerId=style.parent_id,
                    styleId=style.id,
                    visibility=bool(item.layer_enabled),
                    transparency=item.layer_transparency,
                    minScaleDenom=item.layer_min_scale_denom,
                    maxScaleDenom=item.layer_max_scale_denom,
                )

                data['adapter'] = WebMapAdapter.registry.get(
                    item.layer_adapter, 'image').mid
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
                data.update(
                    expanded=item.group_expanded,
                    children=filter(
                        None,
                        map(traverse, item.children)
                    )
                )

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
