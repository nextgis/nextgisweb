from typing import Protocol

from nextgisweb.env import Component
from nextgisweb.env.hook import ComponentHook, ComponentHookProtocol


class ClientCodegenProtocol(ComponentHookProtocol, Protocol):
    def __call__[C: Component](self, comp: C) -> None: ...


client_codegen_hook = ComponentHook[ClientCodegenProtocol]("client_codegen_hook")
