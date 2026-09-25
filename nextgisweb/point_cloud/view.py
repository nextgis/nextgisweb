from msgspec import Struct

from nextgisweb.env import DBSession, gettext

from nextgisweb.jsrealm import jsentry
from nextgisweb.pyramid import client_setting
from nextgisweb.pyramid.tomb import Request
from nextgisweb.resource import Widget
from nextgisweb.resource.extaccess import ExternalAccessLink
from nextgisweb.resource.view import resource_sections

from .component import PointCloudComponent
from .model import (
    POINT_BUDGET_DEFAULT,
    POINT_BUDGET_MAX,
    POINT_BUDGET_MIN,
    PointCloudLayer,
    PointCloudStyle,
)


class LayerWidget(Widget):
    resource = PointCloudLayer
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/point-cloud/layer-widget")


class StyleWidget(Widget):
    resource = PointCloudStyle
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/point-cloud/style-widget")

    def config(self):
        result = super().config()
        parent = self.obj.parent
        result["capabilities"] = {
            "hasRgb": parent.has_rgb,
            "hasIntensity": parent.has_intensity,
            "hasClassification": parent.has_classification,
            "hasReturns": parent.has_returns,
        }
        return result


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


@resource_sections("@nextgisweb/point-cloud/resource-section/default-style", order=-60)
def resource_section_default_style(obj, *, request, **kwargs):
    if not isinstance(obj, PointCloudLayer) or any(
        isinstance(child, PointCloudStyle) for child in obj.children
    ):
        return

    with DBSession.no_autoflush:
        child = PointCloudStyle(parent=obj, owner_user=request.user)
        display_name = child.suggest_display_name(request.localizer.translate)
        child.parent = None

    return dict(
        payload=dict(
            resource=dict(
                cls=PointCloudStyle.identity,
                parent=dict(id=obj.id),
                display_name=display_name,
            )
        )
    )


class PointBudgetClientSetting(Struct, kw_only=True):
    default: int
    min: int
    max: int


@client_setting("pointBudget")
def cs_point_budget(comp: PointCloudComponent, request: Request) -> PointBudgetClientSetting:
    return PointBudgetClientSetting(
        default=POINT_BUDGET_DEFAULT,
        min=POINT_BUDGET_MIN,
        max=POINT_BUDGET_MAX,
    )


def setup_pyramid(comp, config):
    pass
