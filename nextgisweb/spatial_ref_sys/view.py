from msgspec import Struct

from nextgisweb.env import gettext

from nextgisweb.gui import react_renderer
from nextgisweb.pyramid import client_setting

from .component import CatalogSource, SpatialRefSysComponent
from .model import SRS, SRSRef
from .pyramid import srs_factory


@react_renderer("@nextgisweb/spatial-ref-sys/srs-browse")
def srs_browse(request):
    request.user.require_permission(any, *SRS.permissions.all)

    return dict(
        title=gettext("Spatial reference systems"),
        props=dict(readonly=not request.user.has_permission(SRS.permissions.manage)),
    )


@react_renderer("@nextgisweb/spatial-ref-sys/srs-widget")
def srs_create(request):
    request.user.require_permission(SRS.permissions.manage)

    return dict(
        title=gettext("Create new Spatial reference system"),
    )


@react_renderer("@nextgisweb/spatial-ref-sys/srs-widget")
def srs_edit(request):
    request.user.require_permission(any, *SRS.permissions.all)

    srs = request.context
    readonly = not request.user.has_permission(SRS.permissions.manage)
    return dict(
        props=dict(id=srs.id, readonly=readonly),
        title=srs.display_name,
    )


@react_renderer("@nextgisweb/spatial-ref-sys/catalog-browse")
def catalog_browse(request):
    request.user.require_permission(SRS.permissions.manage)

    return dict(
        title=gettext("Spatial reference system catalog"),
    )


@react_renderer("@nextgisweb/spatial-ref-sys/catalog-import")
def catalog_import(request):
    request.user.require_permission(SRS.permissions.manage)

    catalog_id = int(request.matchdict["id"])
    catalog_url = request.env.spatial_ref_sys.options["catalog.url"]
    item_url = (catalog_url + "/srs/" + str(catalog_id)) if catalog_url else None
    return dict(
        title=gettext("Spatial reference system") + " #%d" % catalog_id,
        props=dict(url=item_url, id=catalog_id),
    )


@client_setting("default")
def cs_default(comp: SpatialRefSysComponent, request) -> SRSRef:
    return SRSRef(id=3857)


class SpatialRefSysCatalogClientSetting(Struct, kw_only=True, rename="camel"):
    source: CatalogSource
    url: str | None
    coordinates_search: bool


@client_setting("catalog")
def cs_catalog(comp: SpatialRefSysComponent, request) -> SpatialRefSysCatalogClientSetting:
    source = comp.catalog_source
    return SpatialRefSysCatalogClientSetting(
        source=source,
        url=comp.options["catalog.url"] if source == CatalogSource.REMOTE else None,
        coordinates_search=comp.options["catalog.coordinates_search"]
        if source == CatalogSource.REMOTE
        else False,
    )


def setup_pyramid(comp, config):
    config.add_route("srs.browse", "/srs/", get=srs_browse)
    config.add_route("srs.create", "/srs/create", get=srs_create)
    config.add_route("srs.edit", "/srs/{id}", factory=srs_factory, get=srs_edit)

    config.add_route("srs.catalog", "/srs/catalog", get=catalog_browse)
    config.add_route("srs.catalog.import", "/srs/catalog/{id:pint}", get=catalog_import)
