from ..resource import Widget
from ..resource.extaccess import ExternalAccessLink

from .model import Service
from .util import _


class ServiceWidget(Widget):
    resource = Service
    operation = ('create', 'update')
    amdmod = 'ngw-wmsserver/ServiceWidget'


class WMSLink(ExternalAccessLink):
    title = _("WMS service")
    help = _("Web Map Service (WMS) is a standard protocol developed by the Open Geospatial Consortium for serving georeferenced map images. These images are typically produced by a map server from data provided by a GIS database.")
    doc_url = "https://docs.nextgis.com/docs_ngweb/source/layers.html#using-wms-service-connection"

    resource = Service

    @classmethod
    def url_factory(cls, obj, request) -> str:
        return super().url_factory(obj, request)


def setup_pyramid(comp, config):
    pass
