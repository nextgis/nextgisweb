from __future__ import annotations

from enum import Enum
from functools import partial
from typing import Any, List, Optional, Tuple, Union, get_args, get_origin

from msgspec import UNSET
from typing_extensions import Protocol

from .argparse import ArgumentParser


class ParamType(Enum):
    OPTION = "OPTION"
    ARGUMENT = "ARGUMENT"


OPTION = ParamType.OPTION
ARGUMENT = ParamType.ARGUMENT


class Param:
    def __init__(
        self,
        ptype: ParamType,
        default: Any = UNSET,
        *,
        short: Optional[str] = None,
        flag: bool = False,
        doc: Optional[str] = None,
        **extra,
    ) -> None:
        self.ptype = ptype

        self.name = None
        self.annotation = None

        self.default = default
        self.short = short
        self.flag = flag
        self.doc = doc

        self.extra = extra

    def bind(self, name: str, annotation: Any) -> Param:
        self.name = name
        self.annotation = annotation
        return self

    def setup_parser(self, parser: ArgumentParser) -> None:
        args, kwargs = self._add_argument()
        parser.add_argument(*args, **kwargs)

    def _add_argument(self) -> Tuple[list, dict]:
        assert self.name is not None
        assert self.annotation is not None

        kwargs = dict()

        annnotation = self.annotation
        default = self.default
        iopt = self.ptype == OPTION
        iarg = self.ptype == ARGUMENT

        is_optional = False
        if get_origin(annnotation) == Union:
            a = get_args(annnotation)
            if len(a) == 2 and a[1] == type(None):
                annnotation = a[0]
                is_optional = True
            else:
                raise NotImplementedError

        is_list = False
        if get_origin(annnotation) == list:
            annnotation = get_args(annnotation)[0]
            is_list = True

        if iarg and is_list and is_optional:
            raise NotImplementedError("optional lists aren't supported for args")

        if default is UNSET:
            if is_optional:
                default = None
            elif is_list:
                default = []
            elif iopt:
                kwargs["required"] = True
        elif default is None and not is_optional:
            raise ValueError("Default is None for non optional type")

        if self.flag and (annnotation != bool or not iopt or is_list):
            raise ValueError("Flag is only allowed for booleans")

        args = self._option_strings() if iopt else [self.name]

        if iopt and annnotation == bool and not is_list:
            if self.flag:
                kwargs["action"] = "flag"
                annnotation = None
            elif default is False:
                kwargs["action"] = "store_true"
                annnotation = None

        if annnotation is None:
            pass
        elif iopt:
            if is_list:
                kwargs["action"] = "append"
        elif iarg:
            if is_optional:
                assert not is_list
                kwargs["nargs"] = "?"
            elif is_list:
                kwargs["nargs"] = "+"

        if annnotation is None:
            pass
        elif annnotation in (int, str, bool):
            kwargs["type"] = annnotation
        else:
            raise NotImplementedError(f"Unsupported type: {annnotation}")

        if default is not UNSET:
            kwargs["default"] = default

        if self.doc is not None:
            kwargs["help"] = self.doc

        kwargs.update(self.extra)
        return args, kwargs

    def _option_strings(self) -> List[str]:
        assert self.name is not None
        return (["-" + self.short] if self.short else []) + ["--" + self.name.replace("_", "-")]


class OptArgFactory(Protocol):
    def __call__(
        self,
        default: Any = UNSET,
        *,
        short: Optional[str] = None,
        flag: bool = False,
        doc: Optional[str] = None,
        **extra,
    ) -> Any:
        pass


opt: OptArgFactory = partial(Param, OPTION)
arg: OptArgFactory = partial(Param, ARGUMENT)
