import typing
from warnings import warn

from .component import Component, load_all, require
from .environment import Env, EnvDependency, env, inject, provide, setenv
from .model import DBSession

if typing.TYPE_CHECKING:
    from nextgisweb.lib.i18n import TrStr, TrTpl

    COMP_ID: str

    def gettext(message: str) -> TrStr: ...
    def pgettext(context: str, messsage: str) -> TrStr: ...
    def ngettext(singual: str, plural: str, number: int) -> TrStr: ...
    def npgettext(context: str, singual: str, plural: str, number: int) -> TrStr: ...

    def gettextf(message: str) -> TrTpl: ...
    def pgettextf(context: str, messsage: str) -> TrTpl: ...
    def ngettextf(singual: str, plural: str, number: int) -> TrTpl: ...
    def npgettextf(context: str, singual: str, plural: str, number: int) -> TrTpl: ...


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
