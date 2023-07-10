from nextgisweb.lib.i18n import TrStr

from .component import Component, load_all, require
from .environment import Env, EnvDependency, env, inject, provide, setenv
from .model import DBSession, declarative_base

COMP_ID: str
_: TrStr


def __getattr__(name):
    if name == 'COMP_ID':
        from .component import _COMP_ID
        return _COMP_ID()

    elif name == '_':
        from .i18n import _gettext
        return _gettext()

    elif name == 'Base':
        from .model import _base
        return _base()

    raise AttributeError
