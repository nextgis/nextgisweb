from ..resource import Widget
from ..resource.extaccess import ExternalAccessLink
from .model import Service

from .util import _


class ServiceWidget(Widget):
    resource = Service
    operation = ('create', 'update')
    amdmod = 'ngw-wfsserver/ServiceWidget'


class WFSLink(ExternalAccessLink):
    title = _("Web Feature Service (WFS)")
    help = _("Web Feature Service (WFS) provides an interface allowing requests for geographical features across the web using platform-independent calls.")
    doc_url = "https://docs.nextgis.com/docs_ngweb/source/layers.html#wfs-service"

    resource = Service

    @classmethod
    def url_factory(cls, obj, request) -> str:
        return request.route_url('wfsserver.wfs', id=obj.id)


def setup_pyramid(comp, config):
    pass
