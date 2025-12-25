from typing import Callable

from msgspec import Struct

from nextgisweb.jsrealm import jsentry


class PageSection(Struct, kw_only=True):
    jsentry: str
    order: int
    callback: Callable | None = None


class PageSections:
    def __init__(self, name):
        self._items = []
        self._name = name

    def __iter__(self):
        items = list(self._items)
        items.sort(key=lambda itm: itm.order)
        return items.__iter__()

    def __call__(self, module: str, *, order: int = 0):
        jse = jsentry(module, depth=1)

        def _wrapper(func):
            s = PageSection(jsentry=jse, order=order)
            s.callback = func
            self._items.append(s)

        return _wrapper
