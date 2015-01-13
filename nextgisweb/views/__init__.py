# -*- coding: utf-8 -*-
from pkg_resources import resource_filename

from pyramid.response import Response, FileResponse
from pyramid.httpexceptions import HTTPFound, HTTPNotFound, HTTPForbidden

from ..models import DBSession
from ..package import amd_packages
from ..object_widget import ObjectWidget

from .model_controller import ModelController


def model_context(cls, key='id'):
    
    def wrap(f):
    
        def wrapped(request, *args, **kwargs):
            obj = DBSession.query(cls).get(request.matchdict[key])

            if not obj:
                raise HTTPNotFound()

            return f(request, *(args + (obj, )), **kwargs)

        wrapped.__name__ = 'model(%s, %s)' % (cls.__name__, f.__name__)

        return wrapped

    return wrap


model_loader = model_context


def model_permission(*permissions):
    
    def wrap(f):
    
        def wrapped_f(request, model, *args, **kwargs):
            permission_set = model.acl.permission_set(request.user)

            for permission in permissions:
                if permission not in permission_set:
                    raise HTTPForbidden()

            return f(request, model, *args, **kwargs)

        return wrapped_f

    return wrap


def permalinker(model, route_name, keys=('id', )):
    def _permalink(model, request):
        return request.route_url(route_name, **dict(
            [(k, getattr(model, k)) for k in keys]
        ))

    model.permalink = _permalink


def home(request):
    if 'home_url' in request.env.pyramid.settings:
        return HTTPFound(request.application_url + request.env.pyramid.settings['home_url'])
    else:
        return HTTPFound(location=request.route_url('resource.show', id=0))


def amd_package(request):
    amd_package_name = request.matchdict['subpath'][0]
    amd_package_path = '/'.join(request.matchdict['subpath'][1:])
    for p, asset in amd_packages():
        if p == amd_package_name:
            py_package, path = asset.split(':', 1)
            file_path = resource_filename(py_package, '/'.join((path, amd_package_path)))
            return FileResponse(file_path, cache_max_age=3600)


class DeleteObjectWidget(ObjectWidget):

    def is_applicable(self):
        return self.operation == 'delete'

    def validate(self):
        result = super(DeleteObjectWidget, self).validate()

        self.error = []
        
        if not self.data:
            result = False
            self.error.append(dict(message=u"Необходимо подтвердить удаление объекта."))

        return result

    def populate_obj(self):
        DBSession.delete(self.obj)

    def widget_module(self):
        return 'ngw/modelWidget/DeleteWidget'

    def widget_params(self):
        result = super(DeleteObjectWidget, self).widget_params()
        result['clsDisplayName'] = self.obj.cls_display_name
        return result


class DescriptionObjectWidget(ObjectWidget):

    def is_applicable(self):
        return self.operation in ('create', 'edit')

    def populate_obj(self):
        self.obj.description = self.data if self.data != '' else None

    def widget_module(self):
        return 'ngw/modelWidget/DescriptionWidget'

    def widget_params(self):
        result = super(DescriptionObjectWidget, self).widget_params()

        if self.obj:
            result['value'] = (
                self.obj.description
                if self.obj.description else ''
            )

        return result
