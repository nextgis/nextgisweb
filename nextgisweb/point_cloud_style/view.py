from nextgisweb.env import DBSession

from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget
from nextgisweb.resource.view import resource_sections

from .model import PointCloudStyle


class PointCloudStyleWidget(Widget):
    resource = PointCloudStyle
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/point-cloud-style/editor-widget")

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


@resource_sections("@nextgisweb/point-cloud-style/resource-section/default-style", order=-60)
def resource_section_default_style(obj, *, request, **kwargs):
    if obj.cls != "point_cloud" or any(child.cls == "point_cloud_style" for child in obj.children):
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


def setup_pyramid(comp, config):
    pass
