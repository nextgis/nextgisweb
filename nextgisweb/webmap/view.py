from collections import namedtuple
from urllib.parse import unquote, urljoin, urlparse

from pyramid.renderers import render_to_response

from .adapter import WebMapAdapter
from .model import WebMap, WebMapScope
from .plugin import WebmapPlugin, WebmapLayerPlugin
from .util import webmap_items_to_tms_ids_list, _
from ..dynmenu import DynItem, Label, Link
from ..resource import Resource, Widget, resource_factory, DataScope
from ..gui import REACT_RENDERER


class ExtentWidget(Widget):
    resource = WebMap
    operation = ('create', 'update')
    amdmod = 'ngw-webmap/ExtentWidget'


class ItemWidget(Widget):
    resource = WebMap
    operation = ('create', 'update')
    amdmod = 'ngw-webmap/ItemWidget'


class SettingsWidget(Widget):
    resource = WebMap
    operation = ('create', 'update')
    amdmod = 'ngw-webmap/resource/OtherSettings/OtherSettings'


def settings(request):
    request.require_administrator()
    return dict(
        entrypoint='@nextgisweb/webmap/settings',
        title=_("Web map settings"),
        dynmenu=request.env.pyramid.control_panel)


def check_origin(request):
    if (
        not request.env.webmap.options['check_origin']
        or request.headers.get('Sec-Fetch-Dest') != 'iframe'
        or request.headers.get('Sec-Fetch-Site') == 'same-origin'
    ):
        return True

    referer = request.headers.get('Referer')
    if referer is not None:
        if referer.endswith('/'):
            referer = referer[:-1]
        if (
            not referer.startswith(request.application_url)
            and not request.check_origin(referer)
        ):
            webmap_url = request.route_url(
                'webmap.display',
                id=request.context.id
            ) + '?' + request.query_string

            response = render_to_response(
                'nextgisweb:webmap/template/invalid_origin.mako', dict(
                    origin=urljoin(request.headers.get('Referer'), '/'),
                    domain=urlparse(request.application_url).hostname,
                    webmap_url=webmap_url,
                ), request)
            response.status = 403
            return response

    return True


def display(obj, request):
    is_valid_or_error = check_origin(request)
    if is_valid_or_error is not True:
        return is_valid_or_error

    request.resource_permission(WebMap.scope.webmap.display)

    MID = namedtuple('MID', ['adapter', 'basemap', 'plugin'])

    display.mid = MID(
        set(),
        set(),
        set(),
    )

    # Map level plugins
    plugin = dict()
    for pcls in WebmapPlugin.registry:
        p_mid_data = pcls.is_supported(obj)
        if p_mid_data:
            plugin.update((p_mid_data,))

    def traverse(item):
        data = dict(
            id=item.id,
            type=item.item_type,
            label=item.display_name
        )

        if item.item_type == 'layer':
            style = item.style
            layer = style.parent

            if not style.has_permission(DataScope.read, request.user):
                return None

            # If there are no necessary permissions skip web-map element
            # so it won't be shown in the tree

            # TODO: Security

            # if not layer.has_permission(
            #     request.user,
            #     'style-read',
            #     'data-read',
            # ):
            #     return None

            # Main element parameters
            data.update(
                layerId=style.parent_id,
                styleId=style.id,
                visibility=bool(item.layer_enabled),
                transparency=item.layer_transparency,
                minScaleDenom=item.layer_min_scale_denom,
                maxScaleDenom=item.layer_max_scale_denom,
                drawOrderPosition=item.draw_order_position,
            )

            data['adapter'] = WebMapAdapter.registry.get(
                item.layer_adapter, 'image').mid
            display.mid.adapter.add(data['adapter'])

            # Layer level plugins
            plugin = dict()
            for pcls in WebmapLayerPlugin.registry:
                p_mid_data = pcls.is_layer_supported(layer, obj)
                if p_mid_data:
                    plugin.update((p_mid_data,))

            data.update(plugin=plugin)
            display.mid.plugin.update(plugin.keys())

        elif item.item_type in ('root', 'group'):
            # Recursively run all elements excluding those
            # with no permissions
            data.update(
                expanded=item.group_expanded,
                children=list(filter(
                    None,
                    map(traverse, item.children)
                ))
            )

        return data

    tmp = obj.to_dict()

    config = dict(
        extent=tmp["extent"],
        extent_constrained=tmp["extent_constrained"],
        rootItem=traverse(obj.root_item),
        mid=dict(
            adapter=tuple(display.mid.adapter),
            basemap=tuple(display.mid.basemap),
            plugin=tuple(display.mid.plugin)
        ),
        webmapPlugin=plugin,
        bookmarkLayerId=obj.bookmark_resource_id,
        tinyDisplayUrl=request.route_url('webmap.display.tiny', id=obj.id),
        testEmbeddedMapUrl=request.route_url('webmap.preview_embedded', id=obj.id),
        webmapId=obj.id,
        webmapDescription=obj.description,
        webmapTitle=obj.display_name,
        webmapEditable=obj.editable,
        drawOrderEnabled=obj.draw_order_enabled,
    )

    if request.env.webmap.options['annotation']:
        config['annotations'] = dict(
            enabled=obj.annotation_enabled,
            default=obj.annotation_default,
            scope=dict(
                read=obj.has_permission(WebMapScope.annotation_read, request.user),
                write=obj.has_permission(WebMapScope.annotation_write, request.user),
                manage=obj.has_permission(WebMapScope.annotation_manage, request.user),
            )
        )

    return dict(
        obj=obj,
        display_config=config,
        custom_layout=True
    )

def preview_embedded(request):
    iframe = request.POST['iframe']
    request.response.headerlist.append(("X-XSS-Protection", "0"))
    return dict(
        iframe=unquote(unquote(iframe)),
        title=_("Embedded webmap preview"),
        limit_width=False,
    )


def setup_pyramid(comp, config):
    config.add_route(
        'webmap.display', r'/resource/{id:\d+}/display',
        factory=resource_factory, client=('id',)
    ).add_view(display, context=WebMap, renderer='nextgisweb:webmap/template/display.mako')

    config.add_route(
        'webmap.display.tiny', r'/resource/{id:\d+}/display/tiny',
        factory=resource_factory, client=('id',)
    ).add_view(display, context=WebMap, renderer='nextgisweb:webmap/template/display_tiny.mako')

    config.add_route(
        'webmap.preview_embedded', '/webmap/embedded-preview'
    ).add_view(preview_embedded, renderer='nextgisweb:webmap/template/preview_embedded.mako')

    class DisplayMenu(DynItem):
        def build(self, args):
            yield Label('webmap', _("Web map"))

            if (
                isinstance(args.obj, WebMap)
                and args.obj.has_permission(WebMapScope.display, args.request.user)
            ):
                yield Link(
                    'webmap/display', _("Display"),
                    self._url(),
                    'material:viewMap', True, '_blank')

        def _url(self):
            return lambda args: args.request.route_url(
                'webmap.display', id=args.obj.id)

    WebMap.__dynmenu__.add(DisplayMenu())

    config.add_route(
        'webmap.control_panel.settings',
        '/control-panel/webmap-settings'
    ).add_view(settings, renderer=REACT_RENDERER)

    comp.env.pyramid.control_panel.add(
        Link('settings.webmap', _("Web map"), lambda args: (
            args.request.route_url('webmap.control_panel.settings'))))

    Resource.__psection__.register(
        key='description',
        title=_("External access"),
        template='nextgisweb:webmap/template/section_api_webmap.mako',
        is_applicable=lambda obj: obj.cls == 'webmap' and webmap_items_to_tms_ids_list(obj))
