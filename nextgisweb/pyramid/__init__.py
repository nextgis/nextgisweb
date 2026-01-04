from nextgisweb.lib.apitype import AsJSON, JSONType, XMLType

from .component import PyramidComponent
from .model import Session, SessionStore
from .session import WebSession
from .util import viewargs


def client_setting(name: str):
    from .client import client_setting

    return client_setting(name, stacklevel=1)
