from nextgisweb.env import _

from nextgisweb.resource import Widget
from nextgisweb.resource.extaccess import ExternalAccessLink

from .model import Service


class ServiceWidget(Widget):
    resource = Service
    operation = ('create', 'update')
    amdmod = 'ngw-ogcfserver/ServiceWidget'


class OGCFServerLink(ExternalAccessLink):
    title = _("OGC API Features")
    help = _("OGC API Features provides API building blocks to create, modify and query features on the Web.")
    doc_url = "https://docs.nextgis.com/docs_ngweb/source/layers.html#ogcfserver-service"

    resource = Service

    @classmethod
    def url_factory(cls, obj, request) -> str:
        return request.route_url('ogcfserver.landing_page', id=obj.id)


def setup_pyramid(comp, config):
    pass
