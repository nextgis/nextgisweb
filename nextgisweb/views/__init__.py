from pkg_resources import resource_filename

from pyramid.response import Response, FileResponse
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPFound, HTTPNotFound, HTTPForbidden

from ..models import DBSession
from ..package import amd_packages

def model_context(cls, key='id'):
    def wrap(f):
        def wrapped_f(request, *args, **kwargs):
            obj = DBSession.query(cls).get(request.matchdict[key])

            if not obj:
                raise HTTPNotFound()

            return f(request, *(args + (obj, )), **kwargs)

        return wrapped_f

    return wrap


model_loader = model_context


def model_permission(permission):
    def wrap(f):
        def wrapped_f(request, model, *args, **kwargs):
            if not (permission in model.acl.get_effective_permissions(request.user)):
                raise HTTPForbidden()

            return f(request, model, *args, **kwargs)

        return wrapped_f

    return wrap


def permalinker(model, route_name):
    def _permalink(model, request):
        return request.route_url(route_name, id=model.id)

    model.permalink = _permalink


@view_config(route_name='home', renderer='base.mako')
def home(request):
    return HTTPFound(location=request.route_url('layer'))


@view_config(route_name="amd_package")
def amd_package(request):
    amd_package_name = request.matchdict['subpath'][0]
    amd_package_path = '/'.join(request.matchdict['subpath'][1:])
    for p, asset in amd_packages():
        if p == amd_package_name:
            py_package, path = asset.split(':', 1)
            file_path = resource_filename(py_package, '/'.join((path, amd_package_path)))
            return FileResponse(file_path, cache_max_age=3600)