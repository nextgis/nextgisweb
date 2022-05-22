from ..gui import REACT_RENDERER
from ..dynmenu import DynItem, Link
from ..resource import ConnectionScope, DataScope, Widget, resource_factory, Resource

from .model import PostgisConnection, PostgisLayer
from .util import _


class PostgisConnectionWidget(Widget):
    resource = PostgisConnection
    operation = ('create', 'update')
    amdmod = 'ngw-postgis/ConnectionWidget'


class PostgisLayerWidget(Widget):
    resource = PostgisLayer
    operation = ('create', 'update')
    amdmod = 'ngw-postgis/LayerWidget'


def setup_pyramid(comp, config):
    config.add_route(
        "postgis.diagnostics_page",
        r"/resource/{id:\d+}/postgis-diagnostics",
        factory=resource_factory
    ) \
        .add_view(diagnostics_page, context=PostgisConnection, renderer=REACT_RENDERER) \
        .add_view(diagnostics_page, context=PostgisLayer, renderer=REACT_RENDERER)

    class PostgisMenu(DynItem):
        def build(self, args):
            if isinstance(args.obj, (PostgisConnection, PostgisLayer)):
                yield Link(
                    'extra/postgis-diagnostics', _("Diagnostics"),
                    lambda args: args.request.route_url(
                        'postgis.diagnostics_page', id=args.obj.id),
                    icon="material-flaky")

    Resource.__dynmenu__.add(PostgisMenu())


def diagnostics_page(context, request):
    if isinstance(context, PostgisConnection):
        request.resource_permission(ConnectionScope.connect)
        data = dict(connection=dict(id=context.id))
    elif isinstance(context, PostgisLayer):
        request.resource_permission(DataScope.read)
        data = dict(
            connection=dict(id=context.connection.id),
            layer=dict(id=context.id))
    else:
        raise ValueError

    return dict(
        entrypoint='@nextgisweb/postgis/diagnostics-widget',
        props=dict(data=data), title=_("PostGIS diagnostics"),
        obj=request.context,
    )
