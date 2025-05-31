from typing import Any, Callable, ClassVar

from msgspec import Struct

BreadcrumbAdapter = Callable[[Any, Any], tuple["Breadcrumb", Any] | None]


class Breadcrumb(Struct, kw_only=True):
    adapters: ClassVar[list[BreadcrumbAdapter]] = []

    label: str | None
    link: str
    icon: str | None = None

    @classmethod
    def register(cls, func: BreadcrumbAdapter):
        cls.adapters.append(func)


def breadcrumb_path(obj, request):
    result = list()
    while obj is not None:
        for a in Breadcrumb.adapters:
            aresult = a(obj, request)
            if aresult is not None:
                brcr, obj = aresult
                assert isinstance(brcr, Breadcrumb)
                result.insert(0, brcr)
                break
        else:
            break
    return result
