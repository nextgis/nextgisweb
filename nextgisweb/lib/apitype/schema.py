from typing import (
    TYPE_CHECKING,
    Annotated,
    Any,
    NewType,
    TypeVar,
    Union,
    get_args,
    get_origin,
)
from warnings import warn

from msgspec import NODEFAULT

from .http import ContentType
from .util import annotate, disannotate, unannotate

T = TypeVar("T")

XMLType = Annotated[Any, ContentType.XML]
JSONType = Annotated[Any, ContentType.JSON]
AsJSON = Annotated[T, ContentType.JSON]


class _AnyOfRuntime:
    def __class_getitem__(cls, args):
        result = Annotated[Union[args], _AnyOfRuntime]  # type: ignore
        return result


if TYPE_CHECKING:
    AnyOf = Union
else:
    AnyOf = _AnyOfRuntime


if TYPE_CHECKING:
    Gap = NewType

elif type(NewType) is type:

    class Gap(NewType):
        def __init__(self, name: str, type: Any) -> None:
            self._fallback, self._extras = disannotate(type)
            super().__init__(name, NODEFAULT)

        def __fillgap__(self, type: Any):
            # TODO: Check for the current value
            self.__supertype__ = annotate(type, self._extras)

        def __call__(self, *args, **kwargs):
            return self.__supertype__(*args, **kwargs)

        def __getattribute__(self, name: str) -> Any:
            if name == "__supertype__":
                if (value := self.__dict__["__supertype__"]) is NODEFAULT:
                    warn(
                        f"Accessing {self.name} while it hasn't been populated "
                        "with an actual type. Returning '{self._fallback}'.",
                        RuntimeWarning,
                    )
                    return self._fallback
                return value
            else:
                return super().__getattribute__(name)

else:

    def Gap(name: str, type: Any):
        def new_type(*args, **kwargs):
            return new_type.__supertype__(*args, **kwargs)

        def __fillgap__(type: Any):
            new_type.__supertype__ = annotate(type, new_type._extras)

        new_type.__name__ = name
        new_type.__supertype__ = NODEFAULT

        new_type.__fillgap__ = __fillgap__
        new_type._falback, new_type._extras = disannotate(type)

        return new_type


def fillgap(placeholder: Any, type: Any):
    placeholder = unannotate(placeholder)
    assert hasattr(placeholder, "__fillgap__")
    placeholder.__fillgap__(type)


def _anyof_explode(tdef):
    if get_origin(tdef) is Annotated:
        if getattr(tdef, "__metadata__") == (_AnyOfRuntime,):
            return list(get_args(get_args(tdef)[0])), True
    return [tdef], False


def _update_from(args, source, classes):
    if source == ():
        return args

    result = list(args)
    for s in source:
        for i, c in enumerate(classes):
            if isinstance(s, c):
                result[i] = s

    return tuple(result)


def iter_anyof(tdef, *args, classes=None):
    if classes is None:
        classes = [type(a) for a in args]

    args = _update_from(args, getattr(tdef, "__metadata__", ()), classes)
    anyof_members = _anyof_explode(tdef)[0]
    for t in anyof_members:
        ta = _update_from(args, getattr(t, "__metadata__", ()), classes)
        yield (t, *ta)
