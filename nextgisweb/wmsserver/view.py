from nextgisweb.env import gettext

from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget
from nextgisweb.resource.extaccess import ExternalAccessLink

from .model import Service


class ServiceWidget(Widget):
    resource = Service
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/wmsserver/service-widget")


class WMSLink(ExternalAccessLink):
    title = gettext("WMS service")
    help = gettext(
        "Web Map Service (WMS) is a standard protocol developed by the Open Geospatial Consortium for serving georeferenced map images. These images are typically produced by a map server from data provided by a GIS database."
    )
    docs_url = "docs_ngweb/source/layers.html#using-wms-service-connection"

    resource = Service

    @classmethod
    def url_factory(cls, obj, request) -> str:
        return request.route_url("wmsserver.wms", id=obj.id)


def setup_pyramid(comp, config):
    pass
