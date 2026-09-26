from nextgisweb.env import gettext

from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.gui import react_renderer
from nextgisweb.pyramid.tomb import Configurator, HTTPNotFound, Request
from nextgisweb.resource import DataScope, Resource, resource_factory

from .component import FeatureDescriptionComponent


@react_renderer("@nextgisweb/feature-description/description-manage")
def description(context: Resource, request: Request):
    request.resource_permission(DataScope.read)

    if not context.has_export_permission(request.user):
        raise HTTPNotFound()

    return dict(
        obj=context,
        title=gettext("Manage descriptions"),
        props=dict(id=context.id),
        maxheight=True,
    )


def setup_pyramid(comp: FeatureDescriptionComponent, config: Configurator):
    config.add_route(
        "feature_description.page",
        r"/resource/{id:uint}/descriptions",
        factory=resource_factory,
    ).get(description, context=IFeatureLayer)
