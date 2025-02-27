import sqlalchemy as sa

from nextgisweb.env import DBSession, gettext

from nextgisweb.gui import react_renderer

from ..model import Resource
from .base import ResourceFavorite
from .model import ResourceFavoriteModel


@react_renderer("@nextgisweb/resource/favorite/FavoritePage")
def page(request):
    return dict(title=gettext("Favorites"))


def config_value(request):
    if (
        (matched_route := request.matched_route) is None
        or (route := matched_route.name) is None
        or (request.authenticated_userid is None)
        or (context := getattr(request, "context", None)) is None
        or not isinstance(context, Resource)
    ):
        return None

    for v in ResourceFavorite.registry.values():
        if v.route == route:
            break
    else:
        return None

    current = DBSession.execute(
        sa.select(ResourceFavoriteModel.id).filter_by(
            resource_id=context.id,
            user_id=request.user.id,
            component=v.component,
            kind=v.kind,
        )
    ).scalar()

    return dict(
        identity=v.identity,
        resource=dict(id=context.id),
        current=current,
    )


def setup_pyramid(comp, config):
    config.add_route(
        "resource.favorite.page",
        "/resource/favorite/",
        get=page,
    )
