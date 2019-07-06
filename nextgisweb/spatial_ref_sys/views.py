# -*- coding: utf-8 -*-
from pyramid.events import BeforeRender, subscriber
from sqlalchemy.orm.exc import NoResultFound

from pyramid.httpexceptions import HTTPUnauthorized, HTTPFound, HTTPForbidden
from pyramid.security import remember, forget

from ..object_widget import ObjectWidget
from ..views import ModelController, DeleteWidget, permalinker
from .. import dynmenu as dm

from .models import SRS

from .util import _


def setup_pyramid(comp, config):

    def check_permission(request):
        """ To avoid interdependency of two components:
        auth and security, permissions to edit SRS
        are limited by administrators group membership criterion"""

        request.require_administrator()

    class SRSDeleteWidget(DeleteWidget):


        def validate(self):
            result = super(SRSDeleteWidget, self).validate()
            self.error = []
            if self.operation == 'delete':
                disabled = self.obj.disabled
                if disabled:
                    result = False
                    self.error.append(dict(
                        message=self.request.localizer.translate(
                            _("Unable to delete standard coordinate system."))))
            return result


    class SRSWidget(ObjectWidget):

        def is_applicable(self):
            return self.operation in ('create', 'edit', 'delete',)

        def populate_obj(self):
            super(SRSWidget, self).populate_obj()

            self.obj.display_name = self.data.get('display_name')
            self.obj.wkt = self.data.get('wkt', False)

        def validate(self):
            result = super(SRSWidget, self).validate()
            self.error = []

            if self.operation == 'create':
                conflict = SRS.filter_by(
                    display_name=self.data.get("display_name")).first()
                if conflict:
                    result = False
                    self.error.append(dict(
                        message=self.request.localizer.translate(
                            _("Coordinate system name is not unique."))))
            elif self.operation == 'edit':
                disallowed_wkt_change = self.obj.disabled and self.obj.wkt != self.data.get("wkt")
                if disallowed_wkt_change:
                    result = False
                    self.error.append(dict(
                        message=self.request.localizer.translate(
                            _("Cannot change wkt definition of standard coordinate system."))))

            return result

        def widget_params(self):
            result = super(SRSWidget, self).widget_params()

            if self.obj:
                result['value'] = dict(
                    display_name=self.obj.display_name,
                    auth_name=self.obj.auth_name,
                    auth_srid=self.obj.auth_srid,
                    wkt=self.obj.wkt,
                    disabled=self.obj.disabled
                )

            return result

        def widget_module(self):
            return 'ngw-spatial-ref-sys/SRSWidget'

    class SRSModelController(ModelController):

        def create_context(self, request):
            check_permission(request)
            return dict(template=dict(
                subtitle=("Create new Spatial Reference System"),
                dynmenu=SRS.__dynmenu__))

        def edit_context(self, request):
            check_permission(request)
            obj = SRS.filter_by(**request.matchdict).one()

            return dict(
                obj=obj,
                template=dict(obj=obj)
            )

        def delete_context(self, request):
            check_permission(request)
            obj = SRS.filter_by(**request.matchdict).one()

            disabled = obj.disabled
            if disabled:
                raise ValueError(_("Unable to delete standard coordinate system."))
            
            return dict(
                obj=obj,
                template=dict(obj=obj)
            )

        def create_object(self, context):
            return SRS()

        def query_object(self, context):
            return context['obj']

        def widget_class(self, context, operation):
            if operation == 'delete':
                return SRSDeleteWidget
            else:
                return SRSWidget

        def template_context(self, context):
            return context['template']

    SRSModelController('srs', '/srs').includeme(config)

    permalinker(SRS, 'srs.edit')

    def srs_browse(request):
        check_permission(request)
        return dict(
            title=('Spatial Reference Systems'),
            obj_list=SRS.filter_by(),
            dynmenu=request.env.pyramid.control_panel)

    
    config.add_route('srs.browse', '/srs/') \
        .add_view(srs_browse, renderer='nextgisweb:spatial_ref_sys/template/srs_browse.mako')


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
        dm.Label('srs-list', _("Spatial Reference Systems")),
        SRSMenu('srs-list'),
    )

