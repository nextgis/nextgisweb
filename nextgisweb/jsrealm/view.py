from pathlib import Path

from nextgisweb.gui import react_renderer
from nextgisweb.jsrealm import jsentry
from nextgisweb.pyramid import viewargs

JSENTRY = jsentry("@nextgisweb/jsrealm/testentry/runner")


@react_renderer("@nextgisweb/jsrealm/testentry")
def testentry_browse(request):
    return dict(
        title="Test entries",
    )


@viewargs(renderer="mako")
def testentry(request):
    selected = "/".join(request.matchdict["selected"])
    return dict(
        entrypoint=JSENTRY,
        selected=selected,
        title=selected,
    )


def setup_pyramid(comp, config):
    dist_path = Path(comp.options["dist_path"])
    for p in filter(lambda p: p.is_dir(), dist_path.iterdir()):
        pn = p.name
        if pn in ("amd", "external"):
            for sp in filter(lambda p: p.is_dir(), p.iterdir()):
                config.add_static_path(sp.name, sp)
        else:
            config.add_static_path(pn, p)

    config.add_route("jsrealm.testentry.browse", "/testentry/").add_view(testentry_browse)
    config.add_route("jsrealm.testentry", "/testentry/*selected").add_view(testentry)
