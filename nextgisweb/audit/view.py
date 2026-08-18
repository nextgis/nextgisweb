from msgspec import Struct

from nextgisweb.env import gettext

from nextgisweb.gui import react_renderer
from nextgisweb.pyramid import client_setting
from nextgisweb.pyramid.tomb import Request

from .backend import is_backend_configured, require_backend
from .component import AuditComponent


@react_renderer("@nextgisweb/audit/journal")
def journal(request: Request):
    request.require_administrator()
    require_backend("dbase")

    return dict(
        title=gettext("Journal"),
        maxwidth=True,
        maxheight=True,
    )


class AuditBackendClientSetting(Struct, kw_only=True):
    dbase: bool
    file: bool


@client_setting("backend")
def cs_backend(comp: AuditComponent, request: Request) -> AuditBackendClientSetting:
    return AuditBackendClientSetting(
        dbase=is_backend_configured("dbase"),
        file=is_backend_configured("file"),
    )


def audit_context(request: Request, model, id):
    request.environ["audit.context"] = (model, id)


def setup_pyramid(comp: AuditComponent, config):
    config.add_request_method(audit_context)

    config.add_route(
        "audit.control_panel.journal.browse",
        "/control-panel/journal",
        get=journal,
    )
