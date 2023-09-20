from pathlib import Path

from pyramid.httpexceptions import HTTPNotFound

from nextgisweb.env import inject
from nextgisweb.lib.json import loadb

from nextgisweb.pyramid import viewargs

from .component import JSRealmComponent


@inject()
def read_testentries(*, comp: JSRealmComponent):
    return loadb((Path(comp.options["dist_path"]) / "main/testentry.json").read_bytes())


@viewargs(renderer="mako")
def testentry(request):
    testentries = read_testentries()

    selected = "/".join(request.matchdict["subpath"])
    if selected == "":
        selected = None
    elif selected not in testentries:
        raise HTTPNotFound()

    return dict(
        testentries=read_testentries(), selected=selected, title=selected if selected else ""
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
