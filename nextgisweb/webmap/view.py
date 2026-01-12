from functools import partial
from urllib.parse import unquote, urljoin, urlparse

from msgspec import Struct
from pyramid.renderers import render_to_response

from nextgisweb.env import COMP_ID, gettext
from nextgisweb.lib.dynmenu import Label, Link

from nextgisweb.gui import react_renderer
from nextgisweb.jsrealm import icon, jsentry
from nextgisweb.pyramid import client_setting
from nextgisweb.pyramid.api import csetting
from nextgisweb.render.view import TMSLink
from nextgisweb.resource import Resource, ResourceFactory, ResourceScope, Widget

from .adapter import WebMapAdapter
from .component import WebMapComponent
from .model import WebMap
from .util import webmap_items_to_tms_ids_list


class ItemWidget(Widget):
    resource = WebMap
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/webmap/items-widget")


class SettingsWidget(Widget):
    resource = WebMap
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/webmap/settings-widget")


def check_origin(request):
    if (
        not request.env.webmap.options["check_origin"]
        or request.headers.get("Sec-Fetch-Dest") != "iframe"
        or request.headers.get("Sec-Fetch-Site") == "same-origin"
    ):
        return True

    referer = request.headers.get("Referer")
    if referer is not None:
        if referer.endswith("/"):
            referer = referer[:-1]
        if not referer.startswith(request.application_url) and not request.check_origin(referer):
            webmap_url = (
                request.route_url("webmap.display", id=request.context.id)
                + "?"
                + request.query_string
            )

            response = render_to_response(
                "nextgisweb:webmap/template/invalid_origin.mako",
                dict(
                    origin=urljoin(request.headers.get("Referer"), "/"),
                    domain=urlparse(request.application_url).hostname,
                    webmap_url=webmap_url,
                ),
                request,
            )
            response.status = 403
            return response

    return True


def display_view(request, **kwargs):
    is_valid_or_error = check_origin(request)
    if is_valid_or_error is not True:
        return is_valid_or_error

    request.resource_permission(ResourceScope.read)

    obj = request.context
    th = obj.title if obj.title else obj.display_name
    return dict(obj=obj, title=th, header=th, props=dict(id=obj.id), adaptive=True, **kwargs)


@react_renderer("@nextgisweb/webmap/display/DisplayPage")
def display(request):
    return display_view(
        request,
        layout_mode="headerOnly",
        hide_resource_filter=True,
        hide_menu=True,
    )


@react_renderer("@nextgisweb/webmap/display-tiny")
def display_tiny(request):
    return display_view(request, layout_mode="nullSpace")


@react_renderer("@nextgisweb/webmap/clone-webmap")
def clone(request):
    request.resource_permission(ResourceScope.read)
    return dict(
        props=dict(id=request.context.id),
        obj=request.context,
        title=gettext("Clone web map"),
    )


@react_renderer("@nextgisweb/webmap/preview-embedded")
def preview_embedded(request):
    iframe = None
    if "iframe" in request.POST:
        iframe = unquote(unquote(request.POST["iframe"]))
        request.response.headerlist.append(("X-XSS-Protection", "0"))

    return dict(
        title=gettext("Embedded webmap preview"),
        props=dict(iframe=iframe),
        limit_width=False,
        adaptive=True,
    )


@react_renderer("@nextgisweb/webmap/settings")
def settings(request):
    request.require_administrator()
    return dict(
        title=gettext("Web map settings"),
        dynmenu=request.env.pyramid.control_panel,
    )


class WebMapTMSLink(TMSLink):
    resource = WebMap
    interface = None

    @classmethod
    def url_factory(cls, obj, request) -> str:
        rids = ",".join(map(str, webmap_items_to_tms_ids_list(obj)))
        return request.route_url("render.tile") + "?resource=" + rids + "&nd=204&z={z}&x={x}&y={y}"


class WebMapAdapterCS(Struct, kw_only=True):
    display_name: str


@client_setting("adapters")
def cs_adapters(comp: WebMapComponent, request) -> dict[str, WebMapAdapterCS]:
    return {
        i.identity: WebMapAdapterCS(display_name=request.localizer.translate(i.display_name))
        for i in WebMapAdapter.registry.values()
    }


@client_setting("editing")
def cs_editing(comp: WebMapComponent, request) -> bool:
    return comp.options["editing"]


@client_setting("annotation")
def cs_annotation(comp: WebMapComponent, request) -> bool:
    return comp.options["annotation"]


@client_setting("checkOrigin")
def cs_check_origin(comp: WebMapComponent, request) -> bool:
    return comp.options["check_origin"]


@client_setting("nominatimUrl")
def cs_nominatim_url(comp: WebMapComponent, request) -> str:
    return comp.options["nominatim.url"].rstrip("/")


def setup_pyramid(comp, config):
    resource_factory = ResourceFactory(context=WebMap)

    config.add_route(
        "webmap.display",
        r"/resource/{id:uint}/display",
        factory=resource_factory,
        get=display,
    )

    config.add_route(
        "webmap.display.tiny",
        r"/resource/{id:uint}/display/tiny",
        factory=resource_factory,
        get=display_tiny,
    )

    config.add_route(
        "webmap.clone",
        r"/resource/{id:uint}/clone",
        factory=resource_factory,
        get=clone,
    )

    config.add_route(
        "webmap.preview_embedded",
        "/webmap/embedded-preview",
        get=preview_embedded,
        post=preview_embedded,
    )

    config.add_route(
        "webmap.control_panel.settings",
        "/control-panel/webmap-settings",
        get=settings,
    )

    for k, v in csetting.registry[COMP_ID].items():

        def cs_k(comp: WebMapComponent, request, *, cs) -> v.gtype:  # type: ignore
            return cs.getter()

        cs_k.__name__ = f"cs_{k}"
        client_setting(k)(partial(cs_k, cs=v))

    icon_display = icon("display")
    icon_clone = icon("material/content_copy")

    @Resource.__dynmenu__.add
    def _resource_dynmenu(args):
        if not isinstance(args.obj, WebMap):
            return

        yield Label("webmap", gettext("Web map"))

        if args.obj.has_permission(ResourceScope.read, args.request.user):
            yield Link(
                "webmap/display",
                gettext("Display"),
                lambda args: args.request.route_url("webmap.display", id=args.obj.id),
                important=True,
                target="_blank",
                icon=icon_display,
            )

        if args.obj.has_permission(ResourceScope.read, args.request.user):
            yield Link(
                "webmap/clone",
                gettext("Clone"),
                lambda args: args.request.route_url("webmap.clone", id=args.obj.id),
                important=False,
                target="_self",
                icon=icon_clone,
            )

    @comp.env.pyramid.control_panel.add
    def _control_panel(args):
        if args.request.user.is_administrator:
            yield Link(
                "settings.webmap",
                gettext("Web map"),
                lambda args: (args.request.route_url("webmap.control_panel.settings")),
            )
