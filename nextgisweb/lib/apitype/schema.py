from typing import TYPE_CHECKING, Any, TypeVar, Union, get_args

from typing_extensions import Annotated

from .http import ContentType

T = TypeVar('T')

JSONType = Annotated[Any, ContentType.JSON]
AsJSON = Annotated[T, ContentType.JSON]


if TYPE_CHECKING:
    AnyOf = Union
else:
    class AnyOf:
        def __class_getitem__(cls, args):
            res = Union[args]
            res._oneof = True
            return res


def _oneof_members(tdef):
    if getattr(tdef, '_oneof', False):
        return get_args(tdef)
    else:
        return [tdef]


def _update_from(args, source, classes):
    if source == ():
        return args

    result = list(args)
    for s in source:
        for i, c in enumerate(classes):
            if isinstance(s, c):
                result[i] = s

    return tuple(result)


def enumerate_anyof(tdef, *args, classes=None):
    if classes is None:
        classes = [type(a) for a in args]

    args = _update_from(args, getattr(tdef, '__metadata__', ()), classes)
    for t in _oneof_members(tdef):
        ta = _update_from(args, getattr(t, '__metadata__', ()), classes)
        yield (t, *ta)
