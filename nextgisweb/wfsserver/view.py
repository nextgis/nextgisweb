from nextgisweb.env import gettext

from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget
from nextgisweb.resource.extaccess import ExternalAccessLink

from .model import Service


class ServiceWidget(Widget):
    resource = Service
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/wfsserver/service-widget")


class WFSLink(ExternalAccessLink):
    title = gettext("Web Feature Service (WFS)")
    help = gettext(
        "Web Feature Service (WFS) provides an interface allowing requests for geographical features across the web using platform-independent calls."
    )
    docs_url = "docs_ngweb/source/layers.html#wfs-service"

    resource = Service

    @classmethod
    def url_factory(cls, obj, request) -> str:
        return request.route_url("wfsserver.wfs", id=obj.id)


def setup_pyramid(comp, config):
    pass
