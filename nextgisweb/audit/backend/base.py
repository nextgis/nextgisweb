from contextlib import contextmanager

from nextgisweb.env import gettext, inject
from nextgisweb.lib.registry import dict_registry

from nextgisweb.core.exception import NotConfigured

from ..component import AuditComponent


@dict_registry
class BackendBase:
    identity = None

    def __init__(self, comp: AuditComponent) -> None:
        self.options = comp.options.with_prefix(self.identity)

    @contextmanager
    def __call__(self, request):
        yield None

    def maintenance(self):
        pass


registry = BackendBase.registry


@inject()
def is_backend_configured(identity, *, comp: AuditComponent):
    assert identity in registry
    return identity in comp.backends


class AuditBackendNotConfigured(NotConfigured):
    title = gettext("Audit backend not enabled")
    message = gettext("The '{}' audit backend is not configured on this server.")

    def __init__(self, identity):
        super().__init__(message=self.message.format(identity))


def require_backend(identity):
    if not is_backend_configured(identity):
        raise AuditBackendNotConfigured(identity)
