from typing import Optional, Any
from dataclasses import dataclass


@dataclass
class Breadcrumb:
    label: Optional[str]
    link: str
    icon: Optional[str] = None
    parent: Optional[Any] = None


_adapters = list()


def breadcrumb_adapter(func):
    _adapters.append(func)


def breadcrumb_path(obj, request):
    result = list()
    while obj is not None:
        for a in _adapters:
            brcr = a(obj, request)
            if brcr is not None:
                assert isinstance(brcr, Breadcrumb)
                result.insert(0, brcr)
                obj = brcr.parent
                break
        else:
            break
    return result
