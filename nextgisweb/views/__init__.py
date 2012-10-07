from pyramid.response import Response
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPFound, HTTPNotFound, HTTPForbidden

from ..models import (
    DBSession,
)


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
