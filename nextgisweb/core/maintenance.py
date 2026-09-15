from typing import Protocol

from nextgisweb.env import Component
from nextgisweb.env.hook import ComponentHook, ComponentHookProtocol


class MaintenanceProtocol(ComponentHookProtocol, Protocol):
    def __call__[C: Component](self, comp: C, /) -> None: ...


maintenance_hook = ComponentHook[MaintenanceProtocol]("maintenance_hook")
