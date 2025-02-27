from pyramid.httpexceptions import HTTPNotFound
from sqlalchemy.orm.exc import NoResultFound

from nextgisweb.env import gettext
from nextgisweb.lib import dynmenu as dm

from nextgisweb.gui import react_renderer

from .model import SRS
from .pyramid import require_catalog_configured


@react_renderer("@nextgisweb/spatial-ref-sys/srs-browse")
def srs_browse(request):
    request.user.require_permission(any, *SRS.permissions.all)

    return dict(
        title=gettext("Spatial reference systems"),
        props=dict(readonly=not request.user.has_permission(SRS.permissions.manage)),
        dynmenu=request.env.pyramid.control_panel,
    )


@react_renderer("@nextgisweb/spatial-ref-sys/srs-widget")
def srs_create_or_edit(request):
    result = dict(dynmenu=request.env.pyramid.control_panel)

    if "id" not in request.matchdict:
        request.user.require_permission(SRS.permissions.manage)
        result["title"] = gettext("Create new Spatial reference system")
    else:
        request.user.require_permission(any, *SRS.permissions.all)
        try:
            obj = SRS.filter_by(**request.matchdict).one()
        except NoResultFound:
            raise HTTPNotFound()
        readonly = not request.user.has_permission(SRS.permissions.manage)
        result["props"] = dict(id=obj.id, readonly=readonly)
        result["title"] = obj.display_name

    return result


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


def setup_pyramid(comp, config):
    config.add_route("srs.browse", "/srs/", get=srs_browse)
    config.add_route("srs.create", "/srs/create", get=srs_create_or_edit)
    config.add_route("srs.edit", "/srs/{id:pint}", get=srs_create_or_edit)

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
