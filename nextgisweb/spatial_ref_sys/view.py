from msgspec import Struct

from nextgisweb.env import gettext
from nextgisweb.lib import dynmenu as dm

from nextgisweb.gui import react_renderer
from nextgisweb.pyramid import client_setting

from .component import SpatialRefSysComponent
from .model import SRS, SRSRef
from .pyramid import require_catalog_configured, srs_factory


@react_renderer("@nextgisweb/spatial-ref-sys/srs-browse")
def srs_browse(request):
    request.user.require_permission(any, *SRS.permissions.all)

    return dict(
        title=gettext("Spatial reference systems"),
        props=dict(readonly=not request.user.has_permission(SRS.permissions.manage)),
        dynmenu=request.env.pyramid.control_panel,
    )


@react_renderer("@nextgisweb/spatial-ref-sys/srs-widget")
def srs_create(request):
    request.user.require_permission(SRS.permissions.manage)

    return dict(
        title=gettext("Create new Spatial reference system"),
        dynmenu=request.env.pyramid.control_panel,
    )


@react_renderer("@nextgisweb/spatial-ref-sys/srs-widget")
def srs_edit(request):
    request.user.require_permission(any, *SRS.permissions.all)

    srs = request.context
    readonly = not request.user.has_permission(SRS.permissions.manage)
    return dict(
        props=dict(id=srs.id, readonly=readonly),
        title=srs.display_name,
        dynmenu=request.env.pyramid.control_panel,
    )


@react_renderer("@nextgisweb/spatial-ref-sys/catalog-browse")
def catalog_browse(request):
    request.user.require_permission(SRS.permissions.manage)
    require_catalog_configured()

    return dict(
        title=gettext("Spatial reference system catalog"),
        dynmenu=request.env.pyramid.control_panel,
    )


@react_renderer("@nextgisweb/spatial-ref-sys/catalog-import")
def catalog_import(request):
    request.user.require_permission(SRS.permissions.manage)
    require_catalog_configured()

    catalog_id = int(request.matchdict["id"])
    catalog_url = request.env.spatial_ref_sys.options["catalog.url"]
    item_url = catalog_url + "/srs/" + str(catalog_id)
    return dict(
        title=gettext("Spatial reference system") + " #%d" % catalog_id,
        props=dict(url=item_url, id=catalog_id),
        dynmenu=request.env.pyramid.control_panel,
    )


@client_setting("default")
def cs_default(comp: SpatialRefSysComponent, request) -> SRSRef:
    return SRSRef(id=3857)


class SpatialRefSysCatalogClientSetting(Struct, kw_only=True, rename="camel"):
    enabled: bool
    url: str | None
    coordinates_search: bool


@client_setting("catalog")
def cs_catalog(comp: SpatialRefSysComponent, request) -> SpatialRefSysCatalogClientSetting:
    cat_opts = comp.options.with_prefix("catalog")
    return SpatialRefSysCatalogClientSetting(
        enabled=cat_opts["enabled"],
        url=cat_opts["url"] if cat_opts["enabled"] else None,
        coordinates_search=cat_opts["coordinates_search"],
    )


def setup_pyramid(comp, config):
    config.add_route("srs.browse", "/srs/", get=srs_browse)
    config.add_route("srs.create", "/srs/create", get=srs_create)
    config.add_route("srs.edit", "/srs/{id}", factory=srs_factory, get=srs_edit)

    config.add_route("srs.catalog", "/srs/catalog", get=catalog_browse)
    config.add_route("srs.catalog.import", "/srs/catalog/{id:pint}", get=catalog_import)

    @comp.env.pyramid.control_panel.add
    def _control_panel(kwargs):
        has_permissions = kwargs.request.user.has_permission
        any_permission = has_permissions(any, *SRS.permissions.all)
        if not any_permission:
            return

        yield dm.Label("spatial_ref_sys", gettext("Spatial reference systems"))

        yield dm.Link(
            "spatial_ref_sys/browse",
            gettext("List"),
            lambda kwargs: kwargs.request.route_url("srs.browse"),
        )

        if has_permissions(SRS.permissions.manage):
            yield dm.Link(
                "spatial_ref_sys/create",
                gettext("Create"),
                lambda kwargs: kwargs.request.route_url("srs.create"),
            )

            if comp.options["catalog.enabled"]:
                yield dm.Link(
                    "spatial_ref_sys/catalog/browse",
                    gettext("Catalog"),
                    lambda kwargs: kwargs.request.route_url("srs.catalog"),
                )

            if (obj := getattr(kwargs, "obj", None)) and isinstance(obj, SRS):
                yield dm.Link(
                    "spatial_ref_sys/edit",
                    gettext("Edit"),
                    lambda kwargs: kwargs.request.route_url("srs.edit", id=kwargs.obj.id),
                )

                if not obj.disabled:
                    yield dm.Link(
                        "spatial_ref_sys/delete",
                        gettext("Delete"),
                        lambda kwargs: kwargs.request.route_url("srs.delete", id=kwargs.obj.id),
                    )

    SRS.__dynmenu__ = comp.env.pyramid.control_panel
