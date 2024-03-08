import typing

from .component import Component, load_all, require
from .environment import Env, EnvDependency, env, inject, provide, setenv
from .model import DBSession, declarative_base

if typing.TYPE_CHECKING:
    from nextgisweb.lib.i18n import TrStr

    COMP_ID: str

    # fmt: off
    def gettext(message: str) -> TrStr: ...
    def pgettext(context: str, messsage: str) -> TrStr: ...
    def ngettext(singual: str, plural: str, number: int) -> TrStr: ...
    def npgettext(context: str, singual: str, plural: str, number: int) -> TrStr: ...
    # fmt: on

    _ = gettext


def __getattr__(name):
    if name == "COMP_ID":
        from .component import _COMP_ID

        return _COMP_ID()

    elif name in ("_", "gettext", "pgettext", "ngettext", "npgettext"):
        from .component import _tr_str_factory as _factory

        return getattr(_factory(), "gettext" if name == "_" else name)

    elif name == "Base":
        from .model import _base

        return _base()

    raise AttributeError
