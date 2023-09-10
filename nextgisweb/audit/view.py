from nextgisweb.env import gettext
from nextgisweb.lib import dynmenu as dm

from nextgisweb.pyramid import viewargs

from .backend import is_backend_configured, require_backend


@viewargs(renderer="react")
def journal(request):
    request.require_administrator()
    require_backend("dbase")

    return dict(
        title=gettext("Journal"),
        entrypoint="@nextgisweb/audit/journal",
        dynmenu=request.env.pyramid.control_panel,
        maxwidth=True,
        maxheight=True,
    )


def audit_context(request, model, id):
    request.environ["audit.context"] = (model, id)


def setup_pyramid(comp, config):
    config.add_request_method(audit_context)

    config.add_route(
        "audit.control_panel.journal.browse",
        "/control-panel/journal",
        get=journal,
    )

    class CPItems(dm.DynItem):
        def build(self, kwargs):
            if is_backend_configured("dbase"):
                yield dm.Link(
                    "info/journal",
                    gettext("Journal"),
                    lambda args: (args.request.route_url("audit.control_panel.journal.browse")),
                )

    comp.env.pyramid.control_panel.add(CPItems())
