# -*- coding: utf-8 -*-
from StringIO import StringIO

from pyramid.response import Response

from bunch import Bunch

from ..views import model_context, permalinker, ModelController, DeleteObjectWidget
from .. import dynmenu as dm
from ..object_widget import ObjectWidget, CompositeWidget
from ..layer import Layer

from .models import Style


def setup_pyramid(comp, config):
    DBSession = comp.env.core.DBSession

    class StyleObjectWidget(ObjectWidget):

        def is_applicable(self):
            return self.operation in ('create', 'edit')

        def populate_obj(self):
            ObjectWidget.populate_obj(self)

            self.obj.display_name = self.data['display_name']

        def widget_module(self):
            return 'style/Widget'

        def widget_params(self):
            result = ObjectWidget.widget_params(self)

            if self.obj:
                result['value'] = dict(display_name=self.obj.display_name)

            elif len(self.options['layer'].styles) == 0:
                result['value'] = dict(display_name=u"Основной")

            return result

    Style.object_widget = (
        (Style.identity, StyleObjectWidget),
        ('delete', DeleteObjectWidget),
    )

    class StyleController(ModelController):

        def create_context(self, request):
            layer = DBSession.query(Layer) \
                .filter_by(id=request.matchdict['layer_id']) \
                .one()
            request.require_permission(layer, 'style-write')

            identity = request.GET['identity']
            cls = Style.registry[identity]
            template_context = dict(
                obj=layer,
                dynmenu=(comp.env.layer.layer_menu, Bunch(
                    obj=layer,
                    request=request,
                )),
                subtitle=u"Новый стиль",
            )

            widget_options = dict(layer=layer)

            return locals()

        def edit_context(self, request):
            obj = DBSession.query(Style).filter_by(**request.matchdict).one()
            request.require_permission(obj.layer, 'style-write')

            identity = obj.cls
            cls = Style.registry[identity]
            obj = DBSession.query(cls).get(obj.id)

            template_context = dict(
                obj=obj,
            )

            widget_options = dict(layer=obj.layer)

            return locals()

        def delete_context(self, request):
            edit_context = self.edit_context(request)
            return dict(
                edit_context,
                redirect=edit_context['obj'].layer.permalink(request)
            )

        def widget_class(self, context, operation):
            class Composite(CompositeWidget):
                model_class = context['cls']

            return Composite

        def create_object(self, context):
            return context['cls'](
                layer=context['layer'],
            )

        def query_object(self, context):
            return context['obj']

        def template_context(self, context):
            return context['template_context']

    StyleController(
        'style',
        url_base='/layer/{layer_id:\d+}/style',
    ).includeme(config)

    @model_context(Style)
    def tms(request, obj):
        actual_class = Style.registry[obj.cls]
        obj = DBSession.query(Style) \
            .with_polymorphic((actual_class, ))\
            .filter_by(id=obj.id).one()

        request.require_permission(obj.layer, 'style-read')

        z = int(request.GET['z'])
        x = int(request.GET['x'])
        y = int(request.GET['y'])

        req = obj.render_request(obj.layer.srs)
        img = req.render_tile((z, x, y), 256)

        buf = StringIO()
        img.save(buf, 'png')
        buf.seek(0)

        return Response(body_file=buf, content_type='image/png')

    config.add_route('style.tms', '/style/{id:\d+}/tms').add_view(tms)

    @model_context(Style)
    def image(request, obj):
        actual_class = Style.registry[obj.cls]
        obj = DBSession.query(Style) \
            .with_polymorphic((actual_class, ))\
            .filter_by(id=obj.id).one()

        request.require_permission(obj.layer, 'style-read')

        extent = map(float, request.GET['extent'].split(','))
        size = map(int, request.GET['size'].split(','))

        if extent[0] < obj.layer.srs.minx:
            # Костыль для 180
            extent = (
                extent[0] + obj.layer.srs.maxx - obj.layer.srs.minx, extent[1],
                extent[2] + obj.layer.srs.maxx - obj.layer.srs.minx, extent[3],
            )

        req = obj.render_request(obj.layer.srs)
        img = req.render_extent(extent, size)

        buf = StringIO()
        img.save(buf, 'png')
        buf.seek(0)

        return Response(body_file=buf, content_type='image/png')

    config.add_route('style.image', '/style/{id:\d+}/image').add_view(image)

    @model_context(Style)
    def show(request, obj):
        actual_class = Style.registry[obj.cls]
        obj = DBSession.query(Style) \
            .with_polymorphic((actual_class, ))\
            .filter_by(id=obj.id).one()
        request.require_permission(obj.layer, 'style-read')

        return dict(
            obj=obj,
        )

    config.add_route('style.show', '/layer/{layer_id:\d+}/style/{id:\d+}') \
        .add_view(show, renderer='obj.mako')

    Style.__dynmenu__ = dm.DynMenu(
        dm.Label('operation', u"Операции"),
        dm.Link(
            'operation/edit', u"Редактировать",
            lambda args: args.request.route_url(
                'style.edit',
                id=args.obj.id,
                layer_id=args.obj.layer_id
            )
        ),
        dm.Link(
            'operation/delete', u"Удалить",
            lambda args: args.request.route_url(
                'style.delete',
                id=args.obj.id,
                layer_id=args.obj.layer_id
            )
        ),
    )

    class LayerMenuExt(dm.DynItem):

        def build(self, kwargs):
            yield dm.Label('add-style', u"Добавить стиль")

            for cls in Style.registry:
                if cls.is_layer_supported(kwargs.obj):
                    yield dm.Link(
                        'add-style/%s' % cls.identity,
                        cls.cls_display_name,
                        self._create_url(cls)
                    )

        def _create_url(self, cls):
            return lambda kwargs: kwargs.request.route_url(
                'style.create',
                layer_id=kwargs.obj.id,
                _query=dict(
                    identity=cls.identity,
                )
            )

    Layer.__dynmenu__.add(LayerMenuExt())

    comp.env.layer.layer_page_sections.register(
        key='styles',
        priority=20,
        title=u"Стили",
        template="nextgisweb:templates/style/layer_section.mako"
    )

    permalinker(Style, 'style.show', keys=('id', 'layer_id'))
