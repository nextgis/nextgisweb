import typing
from warnings import warn

from .component import Component, load_all, require
from .environment import Env, EnvDependency, env, inject, provide, setenv
from .model import DBSession

if typing.TYPE_CHECKING:
    from nextgisweb.lib.i18n import TrStr as _TrStr
    from nextgisweb.lib.i18n import TrTpl as _TrTpl

    from .model import Base as Base

    COMP_ID: str

    def gettext(message: str) -> _TrStr: ...
    def pgettext(context: str, messsage: str) -> _TrStr: ...
    def ngettext(singual: str, plural: str, number: int) -> _TrStr: ...
    def npgettext(context: str, singual: str, plural: str, number: int) -> _TrStr: ...

    def gettextf(message: str) -> _TrTpl: ...
    def pgettextf(context: str, messsage: str) -> _TrTpl: ...
    def ngettextf(singual: str, plural: str, number: int) -> _TrTpl: ...
    def npgettextf(context: str, singual: str, plural: str, number: int) -> _TrTpl: ...


def __getattr__(name):
    if name == "COMP_ID":
        from .component import _COMP_ID

        return _COMP_ID()

    elif name in (
        "gettext",
        "pgettext",
        "ngettext",
        "npgettext",
        "gettextf",
        "pgettextf",
        "ngettextf",
        "npgettextf",
    ):
        from .component import _tr_str_factory as _factory

        return getattr(_factory(), name)

    elif name == "Base":
        from .model import _base

        return _base()

    raise AttributeError
