# -*- coding: utf-8 -*-
from pyramid.renderers import render_to_response

from ..models import DBSession
from ..object_widget import ObjectWidget


class DeleteWidget(ObjectWidget):

    def widget_module(self):
        return 'ngw-pyramid/modelWidget/Widget'


class ModelController(object):

    def __init__(self, route_prefix, url_base=None, item_path=r'{id:\d+}',
                 client_base=(), client=('id', )):
        if not url_base:
            url_base = '/%s' % route_prefix

        self.route_prefix = route_prefix
        self.url_base = url_base
        self.item_path = item_path

        self.client_base = client_base
        self.client = client

    def includeme(self, config):
        route = lambda s: self.route_prefix + '.' + s

        config.add_route(route('create'), self.url_base + '/create',
                         client=self.client_base)

        config.add_view(self.create, route_name=route('create'))

        config.add_route(route('edit'),
                         '%s/%s/edit' % (self.url_base, self.item_path),
                         client=self.client_base + self.client)

        config.add_view(self.edit, route_name=route('edit'))

        config.add_route(route('delete'),
                         '%s/%s/delete' % (self.url_base, self.item_path),
                         client=self.client_base + self.client)

        config.add_view(self.delete, route_name=route('delete'))

    def create_context(self, request):
        pass

    def edit_context(self, request):
        pass

    def delete_context(self, request):
        pass

    def widget_class(self, context, operation):
        pass

    def create_object(self, context):
        pass

    def query_object(self, context):
        pass

    def template_context(self, context):
        return dict()

    def create(self, request):
        context = self.create_context(request)

        widget_class = self.widget_class(context, 'create')
        widget = widget_class(
            operation='create',
            options=context.get('widget_options')
        )

        if request.method == 'POST':
            widget.bind(data=request.json_body, request=request)

            if widget.validate():
                obj = self.create_object(context)

                widget.bind(obj=obj)
                widget.populate_obj()

                DBSession.add(obj)

                DBSession.flush()

                return render_to_response(
                    'json',
                    dict(
                        status_code=200,
                        redirect=obj.permalink(request),
                    ),
                    request
                )

            else:
                return render_to_response('json', dict(
                    status_code=400,
                    error=widget.widget_error(),
                ), request)

        return render_to_response(
            'model_widget.mako',
            dict(self.template_context(context), widget=widget),
            request
        )

    def edit(self, request):
        context = self.edit_context(request)
        obj = self.query_object(context)

        widget_class = self.widget_class(context, 'edit')
        widget = widget_class(
            obj=obj,
            operation='edit',
            options=context.get('widget_options')
        )

        if request.method == 'POST':
            widget.bind(data=request.json_body, request=request)

            if widget.validate():
                widget.populate_obj()
                request.env.core.DBSession.flush()

                return render_to_response(
                    'json',
                    dict(
                        status_code=200,
                        redirect=obj.permalink(request),
                    ),
                    request
                )

            else:
                return render_to_response('json', dict(
                    status_code=400,
                    error=widget.widget_error(),
                ), request)

        return render_to_response(
            'model_widget.mako',
            dict(self.template_context(context), widget=widget),
            request
        )

    def delete(self, request):
        context = self.delete_context(request)
        obj = self.query_object(context)

        widget_class = self.widget_class(context, 'delete')
        widget = widget_class(
            obj=obj,
            operation='delete',
            options=context.get('widget_options')
        )

        if request.method == 'POST':
            widget.bind(data=request.json_body, request=request)

            if widget.validate():
                DBSession.delete(obj)
                DBSession.flush()

                return render_to_response(
                    'json',
                    dict(
                        status_code=200,
                        redirect=context.get(
                            'redirect',
                            request.route_url(self.route_prefix + '.browse')
                        ),
                    ),
                    request
                )

            else:
                return render_to_response('json', dict(
                    status_code=400,
                    error=widget.widget_error(),
                ), request)

        return render_to_response(
            'model_widget.mako',
            dict(self.template_context(context), widget=widget),
            request
        )
