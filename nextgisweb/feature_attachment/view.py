from msgspec import Struct
from pyramid.httpexceptions import HTTPNotFound

from nextgisweb.env import gettext

from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.gui import react_renderer
from nextgisweb.pyramid import client_setting
from nextgisweb.resource import DataScope, resource_factory

from .component import FeatureAttachmentComponent


@react_renderer("@nextgisweb/feature-attachment/attachment-form")
def attachment(request):
    request.resource_permission(DataScope.read)

    if not request.context.has_export_permission(request.user):
        raise HTTPNotFound()

    return dict(
        obj=request.context,
        title=gettext("Manage attachments"),
        props=dict(id=request.context.id),
        maxheight=True,
    )


class FeatureAttachmentWebmapClientSettings(Struct, kw_only=True):
    bundle: bool


@client_setting("webmap")
def cs_webmap(comp: FeatureAttachmentComponent, request) -> FeatureAttachmentWebmapClientSettings:
    return FeatureAttachmentWebmapClientSettings(bundle=comp.options["webmap.bundle"])


def setup_pyramid(comp, config):
    config.add_route(
        "feature_attachment.page",
        r"/resource/{id:uint}/attachments",
        factory=resource_factory,
    ).add_view(attachment, context=IFeatureLayer)
