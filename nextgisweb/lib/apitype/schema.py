from typing import TYPE_CHECKING, Any, TypeVar, Union, get_args

from typing_extensions import Annotated, _AnnotatedAlias

from .http import ContentType

T = TypeVar("T")

JSONType = Annotated[Any, ContentType.JSON]
AsJSON = Annotated[T, ContentType.JSON]


class _AnyOfRuntime:
    def __class_getitem__(cls, args):
        res = Annotated[Union[args], _AnyOfRuntime]  # type: ignore
        return res


AnyOf = Union if TYPE_CHECKING else _AnyOfRuntime


def _anyof_explode(tdef):
    if type(tdef) is _AnnotatedAlias:
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


def is_anyof(tdef):
    return _anyof_explode(tdef)[1]
