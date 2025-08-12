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
        "Web Map Service (WMS) is a standard protocol developed by the Open Geospatial Consortium for serving dynamically rendered, georeferenced map images. These images are generated on demand, allowing flexible styling and query capabilities."
    )
    docs_url = "docs_ngweb/source/layers.html#using-wms-service-connection"

    resource = Service

    @classmethod
    def url_factory(cls, obj, request) -> str:
        return request.route_url("wmsserver.wms", id=obj.id)


class WMTSLink(ExternalAccessLink):
    title = gettext("WMTS service")
    help = gettext(
        "Web Map Tile Service (WMTS) is a standard protocol developed by the Open Geospatial Consortium for serving georeferenced map tiles. These tiles are retrieved from a server in fixed sizes and zoom levels, enabling fast and efficient display of maps."
    )
    docs_url = None

    resource = Service

    @classmethod
    def url_factory(cls, obj, request) -> str:
        return request.route_url("wmsserver.wmts", id=obj.id)


def setup_pyramid(comp, config):
    pass
