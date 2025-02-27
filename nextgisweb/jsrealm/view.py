from pathlib import Path

from nextgisweb.jsrealm import jsentry
from nextgisweb.pyramid import viewargs

JSENTRY = jsentry("@nextgisweb/jsrealm/testentry/runner")


@viewargs(renderer="mako")
def testentry(request):
    selected = "/".join(request.matchdict["subpath"])
    if selected == "":
        selected = None

    return dict(
        entrypoint=JSENTRY,
        selected=selected,
        title=selected or "Test entries",
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

    config.add_route("jsrealm.testentry", "/testentry/*subpath").add_view(testentry)
