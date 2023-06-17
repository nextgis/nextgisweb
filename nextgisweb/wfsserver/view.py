from ..resource import Widget
from ..resource.view import resource_sections
from .model import Service

from .util import _


class ServiceWidget(Widget):
    resource = Service
    operation = ('create', 'update')
    amdmod = 'ngw-wfsserver/ServiceWidget'


def setup_pyramid(comp, config):
    @resource_sections(title=_("External access"), template='section_api_wfs.mako')
    def resource_section_external_access(obj):
        return obj.cls == 'wfsserver_service'
