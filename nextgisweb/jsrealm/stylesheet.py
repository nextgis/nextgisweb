from collections.abc import Iterable
from typing import Protocol

from nextgisweb.env import Component
from nextgisweb.env.hook import ComponentHook, ComponentHookProtocol

StylesheetResult = Iterable[str]


class StylesheetProtocol(ComponentHookProtocol, Protocol):
    def __call__[C: Component](self, comp: C) -> StylesheetResult: ...


stylesheet_hook = ComponentHook[StylesheetProtocol]("stylesheet_hook")
