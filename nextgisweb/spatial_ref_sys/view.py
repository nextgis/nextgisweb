from typing import Annotated

from nextgisweb.env import gettext
from nextgisweb.lib.apitype.param import Path

from nextgisweb.gui import react_renderer
from nextgisweb.pyramid import client_setting
from nextgisweb.pyramid.tomb import Configurator, Request

from .component import SpatialRefSysComponent
from .model import SRS, SRSRef
from .pyramid import srs_factory


@react_renderer("@nextgisweb/spatial-ref-sys/srs-browse")
def srs_browse(request: Request):
    request.user.require_permission(any, *SRS.permissions.all)

    return dict(
        title=gettext("Spatial reference systems"),
        props=dict(readonly=not request.user.has_permission(SRS.permissions.manage)),
    )


@react_renderer("@nextgisweb/spatial-ref-sys/srs-widget")
def srs_create(request: Request):
    request.user.require_permission(SRS.permissions.manage)

    return dict(
        title=gettext("Create new Spatial reference system"),
    )


@react_renderer("@nextgisweb/spatial-ref-sys/srs-widget")
def srs_edit(context: SRS, request: Request):
    request.user.require_permission(any, *SRS.permissions.all)

    readonly = not request.user.has_permission(SRS.permissions.manage)
    return dict(
        props=dict(id=context.id, readonly=readonly),
        title=context.display_name,
    )


@react_renderer("@nextgisweb/spatial-ref-sys/catalog-browse")
def catalog_browse(request: Request):
    request.user.require_permission(SRS.permissions.manage)

    return dict(
        title=gettext("Spatial reference system catalog"),
    )


@react_renderer("@nextgisweb/spatial-ref-sys/catalog-import")
def catalog_import(request: Request, catalog_id: Annotated[int, Path(name="id")]):
    request.user.require_permission(SRS.permissions.manage)

    return dict(
        title=gettext("Spatial reference system") + " #%d" % catalog_id,
        props=dict(id=catalog_id),
    )


@client_setting("default")
def cs_default(comp: SpatialRefSysComponent, request: Request) -> SRSRef:
    return SRSRef(id=3857)


def setup_pyramid(comp: SpatialRefSysComponent, config: Configurator):
    config.add_route("srs.browse", "/srs/", get=srs_browse)
    config.add_route("srs.create", "/srs/create", get=srs_create)
    config.add_route("srs.edit", "/srs/{id}", factory=srs_factory, get=srs_edit)

    config.add_route("srs.catalog", "/srs/catalog", get=catalog_browse)
    config.add_route("srs.catalog.import", "/srs/catalog/{id:pint}", get=catalog_import)
