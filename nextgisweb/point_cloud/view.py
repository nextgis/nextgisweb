from msgspec import Struct

from nextgisweb.env import gettext

from nextgisweb.jsrealm import jsentry
from nextgisweb.pyramid import client_setting
from nextgisweb.pyramid.tomb import Request
from nextgisweb.resource import DataScope, Widget
from nextgisweb.resource.extaccess import ExternalAccessLink
from nextgisweb.resource.view import resource_sections

from .component import PointCloudComponent
from .model import (
    PointCloudLayer,
)


class LayerWidget(Widget):
    resource = PointCloudLayer
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/point-cloud/layer-widget")


class COPCLink(ExternalAccessLink):
    title = gettext("Cloud Optimized Point Cloud")
    help = gettext(
        "A Cloud Optimized Point Cloud (COPC) is a LAZ file with an internal "
        "organization that allows clients to read only the parts they need using "
        "HTTP range requests. To open it in QGIS, use Layer > Add Layer > Add Point "
        "Cloud Layer, select the HTTP(S) protocol and paste this URL."
    )

    resource = PointCloudLayer

    @classmethod
    def url_factory(cls, obj, request: Request) -> str:
        return request.route_url("point_cloud.copc", id=obj.id)


@resource_sections("@nextgisweb/point-cloud/resource-section/preview")
def resource_section_preview(obj, *, request, **kwargs):
    # COPC data access requires data read permission
    return isinstance(obj, PointCloudLayer) and obj.has_permission(DataScope.read, request.user)


class TerrainClientSetting(Struct, kw_only=True):
    url: str
    copyright_text: str | None
    copyright_url: str | None


@client_setting("terrain")
def cs_terrain(comp: PointCloudComponent, request: Request) -> TerrainClientSetting | None:
    opts = comp.options.with_prefix("terrain")
    if not opts["enabled"]:
        return None
    return TerrainClientSetting(
        url=opts["url"],
        copyright_text=opts["copyright_text"],
        copyright_url=opts["copyright_url"],
    )


def setup_pyramid(comp, config):
    pass
