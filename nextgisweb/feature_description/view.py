from pyramid.httpexceptions import HTTPNotFound

from nextgisweb.env import gettext

from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.gui import react_renderer
from nextgisweb.pyramid.tomb import Request
from nextgisweb.resource import DataScope, resource_factory

from .component import FeatureDescriptionComponent


@react_renderer("@nextgisweb/feature-description/description-manage")
def description(request: Request):
    request.resource_permission(DataScope.read)

    if not request.context.has_export_permission(request.user):
        raise HTTPNotFound()

    return dict(
        obj=request.context,
        title=gettext("Manage descriptions"),
        props=dict(id=request.context.id),
        maxheight=True,
    )


def setup_pyramid(comp: FeatureDescriptionComponent, config):
    config.add_route(
        "feature_description.page",
        r"/resource/{id:uint}/descriptions",
        factory=resource_factory,
    ).add_view(description, context=IFeatureLayer)
