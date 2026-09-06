from nextgisweb.lib.apitype import AsJSON, JSONType, XMLType

from .component import CompanyLogo, CompanyUrl, HelpPageUrl, LinkPreviewDefaults, PyramidComponent
from .model import Session, SessionStore
from .session import WebSession
from .util import viewargs

__all__ = [
    "AsJSON",
    "CompanyLogo",
    "CompanyUrl",
    "HelpPageUrl",
    "JSONType",
    "LinkPreviewDefaults",
    "PyramidComponent",
    "Session",
    "SessionStore",
    "WebSession",
    "XMLType",
    "client_setting",
    "viewargs",
]


def client_setting(name: str):
    from .client import client_setting

    return client_setting(name, stacklevel=1)
