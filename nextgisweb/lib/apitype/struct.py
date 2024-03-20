from enum import Enum
from itertools import groupby
from types import MappingProxyType
from typing import TYPE_CHECKING, Any, List, Tuple, TypeVar, Union

from msgspec import UNSET, UnsetType, defstruct
from msgspec.inspect import type_info
from msgspec.structs import asdict
from typing_extensions import Annotated

from .util import annotate, disannotate


def flag(value: str):
    u = value.upper()
    e = Enum(u, {u: value})
    return getattr(e, u)


class OP(Enum):
    CREATE = "Create"
    READ = "Read"
    UPDATE = "Update"


class Control(Enum):
    OMIT = "OMIT"
    MAY = "MAY"


def _cond(value):
    grouped = {t: frozenset(value) for t, value in groupby(value, type)}
    return MappingProxyType(grouped)


class Conditional:
    cond: MappingProxyType
    meta: Tuple

    def __init__(self, cond, *meta):
        self.cond = _cond(cond)
        self.meta = meta


def omit(*cond):
    return Conditional(cond, Control.OMIT)


def when(cond, *meta):
    return Conditional(cond, *meta)


ST = TypeVar("ST")


def derive(struct: ST, *spec) -> ST:
    ann = struct.__annotations__
    cond = _cond(spec)
    ti = type_info(struct)
    nsfields = list()
    for f in ti.fields:
        ftype, fmeta = disannotate(ann[f.name])
        fdefault = f.default
        fnmeta = list()
        control = None
        for m in fmeta:
            if type(m) == Conditional:
                for k, v in m.cond.items():
                    if k not in cond:
                        break
                    if crit := cond.get(k):
                        if not v.intersection(crit):
                            break
                else:
                    for md in m.meta:
                        if md in Control:
                            assert control is None
                            control = md
                        else:
                            fnmeta.append(md)
            else:
                fnmeta.append(m)

        if control is Control.OMIT:
            continue  # Skip this field

        if control is Control.MAY:
            utype = Union[annotate(ftype, fnmeta), UnsetType]
            nsfields.append((f.name, utype, UNSET))
        else:
            nsfields.append((f.name, annotate(ftype, fnmeta), fdefault))

    name = struct.__name__.lstrip("_")  # type: ignore
    name += "".join(s.value for s in spec if s.value)

    return defstruct(name, nsfields, kw_only=True, module=struct.__module__)  # type: ignore


def struct_items(struct) -> List[Tuple[str, Any]]:
    return [(attr, value) for attr, value in asdict(struct).items() if value is not UNSET]


class _Derived:
    def __class_getitem__(cls, args):
        return derive(*args)


Derived = Annotated if TYPE_CHECKING else _Derived


T = TypeVar("T")
ReadOnly = Annotated[T, Conditional([OP.CREATE, OP.UPDATE], Control.OMIT)]
CreateOnly = Annotated[T, Conditional([OP.UPDATE], Control.OMIT)]
Required = Annotated[T, Conditional([OP.UPDATE], Control.MAY)]
Default = Annotated[T, Conditional([OP.CREATE, OP.UPDATE], Control.MAY)]
