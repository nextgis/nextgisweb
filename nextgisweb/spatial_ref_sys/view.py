from pyramid.httpexceptions import HTTPNotFound
from sqlalchemy.orm.exc import NoResultFound

from ..views import permalinker
from .. import dynmenu as dm
from ..gui import REACT_RENDERER

from .model import SRS
from .util import _


def check_permission(request):
    """ To avoid interdependency of two components:
    auth and security, permissions to edit SRS
    are limited by administrators group membership criterion"""

    request.require_administrator()


def catalog_browse(request):
    check_permission(request)
    return dict(
        title=_("Spatial reference system catalog"),
        entrypoint="@nextgisweb/spatial-ref-sys/catalog-browse",
        dynmenu=request.env.pyramid.control_panel)


def catalog_import(request):
    check_permission(request)
    catalog_id = int(request.matchdict['id'])
    catalog_url = request.env.spatial_ref_sys.options['catalog.url']
    item_url = catalog_url + '/srs/' + str(catalog_id)
    return dict(
        title=_("Spatial reference system") + ' #%d' % catalog_id,
        entrypoint="@nextgisweb/spatial-ref-sys/catalog-import",
        props=dict(url=item_url, id=catalog_id),
        dynmenu=request.env.pyramid.control_panel)


def srs_browse(request):
    request.require_administrator()

    return dict(
        title=_("Spatial reference systems"),
        entrypoint="@nextgisweb/spatial-ref-sys/srs-browse",
        dynmenu=request.env.pyramid.control_panel)


def srs_create_or_edit(request):
    request.require_administrator()

    result = dict(
        entrypoint='@nextgisweb/spatial-ref-sys/srs-widget',
        dynmenu=request.env.pyramid.control_panel)

    if 'id' not in request.matchdict:
        result['title'] = _("Create new Spatial reference system")
    else:
        try:
            obj = SRS.filter_by(**request.matchdict).one()
        except NoResultFound:
            raise HTTPNotFound()
        result['props'] = dict(id=obj.id)
        result['title'] = obj.display_name

    return result


def setup_pyramid(comp, config):

    config.add_route('srs.browse', '/srs/', client=True) \
        .add_view(srs_browse, renderer=REACT_RENDERER)
    config.add_route('srs.create', '/srs/create', client=True) \
        .add_view(srs_create_or_edit, renderer=REACT_RENDERER)
    config.add_route('srs.edit', '/srs/{id:\\d+}', client=True) \
        .add_view(srs_create_or_edit, renderer=REACT_RENDERER)

    permalinker(SRS, 'srs.edit')

    class SRSMenu(dm.DynItem):

        def build(self, kwargs):
            yield dm.Link(
                self.sub('browse'), _("List"),
                lambda kwargs: kwargs.request.route_url('srs.browse')
            )

            yield dm.Link(
                self.sub('create'), _("Create"),
                lambda kwargs: kwargs.request.route_url('srs.create')
            )

            if comp.options['catalog.enabled']:
                yield dm.Link(
                    self.sub('catalog/browse'), _("Catalog"),
                    lambda kwargs: kwargs.request.route_url('srs.catalog')
                )

            if 'obj' in kwargs and isinstance(kwargs.obj, SRS):
                yield dm.Link(
                    self.sub('edit'), _("Edit"),
                    lambda kwargs: kwargs.request.route_url(
                        'srs.edit',
                        id=kwargs.obj.id
                    )
                )
                if not kwargs.obj.disabled:
                    yield dm.Link(
                        self.sub('delete'), _("Delete"),
                        lambda kwargs: kwargs.request.route_url(
                            'srs.delete',
                            id=kwargs.obj.id
                        )
                    )

    SRS.__dynmenu__ = comp.env.pyramid.control_panel

    comp.env.pyramid.control_panel.add(
        dm.Label('spatial_ref_sys', _("Spatial reference systems")),
        SRSMenu('spatial_ref_sys'),
    )

    if comp.options['catalog.enabled']:
        config.add_route(
            'srs.catalog',
            '/srs/catalog'
        ).add_view(catalog_browse, renderer=REACT_RENDERER)

        config.add_route(
            'srs.catalog.import',
            r'/srs/catalog/{id:\d+}', client=('id',)
        ).add_view(catalog_import, renderer=REACT_RENDERER)
