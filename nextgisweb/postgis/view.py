from nextgisweb.env import gettext
from nextgisweb.lib.dynmenu import Link

from nextgisweb.gui import react_renderer
from nextgisweb.jsrealm import icon, jsentry
from nextgisweb.resource import ConnectionScope, DataScope, Resource, Widget, resource_factory

from .model import PostgisConnection, PostgisLayer


class PostgisConnectionWidget(Widget):
    resource = PostgisConnection
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/postgis/connection-widget")


class PostgisLayerWidget(Widget):
    resource = PostgisLayer
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/postgis/layer-widget")


def setup_pyramid(comp, config):
    config.add_route(
        "postgis.diagnostics_page",
        r"/resource/{id:uint}/postgis-diagnostics",
        factory=resource_factory,
    ).add_view(diagnostics_page, context=PostgisConnection).add_view(
        diagnostics_page, context=PostgisLayer
    )

    icon_diagnostics = icon("material/flaky")

    @Resource.__dynmenu__.add
    def _resource_dynmenu(args):
        if (
            isinstance(args.obj, (PostgisConnection, PostgisLayer))
            and args.request.user.keyname != "guest"
        ):
            yield Link(
                "extra/postgis-diagnostics",
                gettext("Diagnostics"),
                lambda args: args.request.route_url("postgis.diagnostics_page", id=args.obj.id),
                icon=icon_diagnostics,
            )


@react_renderer("@nextgisweb/postgis/diagnostics-widget")
def diagnostics_page(request):
    context = request.context

    if isinstance(context, PostgisConnection):
        request.resource_permission(ConnectionScope.connect)
        data = dict(connection=dict(id=context.id))
    elif isinstance(context, PostgisLayer):
        request.resource_permission(DataScope.read)
        data = dict(connection=dict(id=context.connection.id), layer=dict(id=context.id))
    else:
        raise ValueError

    return dict(
        props=dict(data=data),
        title=gettext("PostGIS diagnostics"),
        obj=request.context,
    )
