from ..resource import Resource, Widget
from .model import Connection, Layer
from .util import _


class ClientWidget(Widget):
    resource = Connection
    operation = ('create', 'update')
    amdmod = 'ngw-tmsclient/ConnectionWidget'


class LayerWidget(Widget):
    resource = Layer
    operation = ('create', 'update')
    amdmod = 'ngw-tmsclient/LayerWidget'


def setup_pyramid(comp, config):
    Resource.__psection__.register(
        key='tmsclient_connection', priority=60,
        title=_('TMS capabilities'),
        is_applicable=lambda obj: False,
    )
