from contextlib import contextmanager

from nextgisweb.env import gettext, inject
from nextgisweb.lib.registry import dict_registry

from nextgisweb.core.exception import UserException

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


def require_backend(identity):
    if not is_backend_configured(identity):
        raise BackendNotConfigured


class BackendNotConfigured(UserException):
    title = gettext("Audit backend not configured")
    http_status_code = 403
