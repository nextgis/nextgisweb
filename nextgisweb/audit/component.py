from __future__ import annotations

from datetime import timedelta
from types import MappingProxyType
from typing import TYPE_CHECKING, Mapping, Optional

from nextgisweb.env import Component
from nextgisweb.lib.config import Option

if TYPE_CHECKING:
    from .backend import BackendBase


class AuditComponent(Component):
    backends: Optional[Mapping[str, BackendBase]] = None

    def initialize(self):
        from .backend import registry

        super().initialize()
        self.backends = MappingProxyType(
            {
                identity: cls(self)
                for identity, cls in registry.items()
                if self.options[cls.identity + ".enabled"]
            }
        )

    def setup_pyramid(self, config):
        from . import api, view

        if self.backends and len(self.backends) > 0:
            config.add_tween(
                "nextgisweb.audit.tween.factory",
                over=("nextgisweb.pyramid.exception.unhandled_exception_tween_factory",),
            )

        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    def maintenance(self):
        super().maintenance()
        for backend in self.backends.values():
            backend.maintenance()

    option_annotations = (
        # File
        Option("file.enabled", bool, default=False),
        Option("file.path", str, default="/dev/stderr"),
        # Database
        Option("dbase.enabled", bool, default=False),
        Option("dbase.retention", timedelta, default=timedelta(days=92)),
        # Filter
        Option("filter.request_method", list, default=None),
        Option("filter.request_path", list, default=None),
    )
