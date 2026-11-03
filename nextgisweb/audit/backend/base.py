from collections.abc import Callable, Generator
from contextlib import contextmanager
from datetime import datetime
from typing import ClassVar

from nextgisweb.env import gettext, gettextf, inject
from nextgisweb.lib.registry import DictRegistry, dict_registry

from nextgisweb.core.exception import NotConfigured
from nextgisweb.pyramid.tomb import Request

from ..component import AuditComponent


@dict_registry
class BackendBase:
    registry: ClassVar[DictRegistry[type["BackendBase"]]]
    identity: ClassVar[str]

    def __init__(self, comp: AuditComponent) -> None:
        self.options = comp.options.with_prefix(self.identity)

    @contextmanager
    def __call__(self, request: Request) -> Generator[Callable[[datetime, dict], None]]:
        raise NotImplementedError


registry = BackendBase.registry


@inject()
def is_backend_configured(identity: str, *, comp: AuditComponent = inject.arg()) -> bool:
    assert identity in registry
    return identity in (comp.backends or ())


class AuditBackendNotConfigured(NotConfigured):
    title = gettext("Audit backend not enabled")
    message_tpl = gettextf("The '{}' audit backend is not configured on this server.")

    def __init__(self, identity: str) -> None:
        super().__init__(message=self.message_tpl(identity))


def require_backend(identity: str) -> None:
    if not is_backend_configured(identity):
        raise AuditBackendNotConfigured(identity)
