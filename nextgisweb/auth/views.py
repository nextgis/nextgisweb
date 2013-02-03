# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPFound, HTTPForbidden
from pyramid.security import remember, forget

from ..models import DBSession
from ..wtforms import Form, fields

from .models import Principal, User


def query_users():
    return DBSession.query(User).filter_by(system=False)


class LoginForm(Form):
    username = fields.QuerySelectField(u"Имя пользователя", query_factory=query_users)
    submit = fields.SubmitField(u"Войти")


@view_config(route_name="auth.login", renderer="auth/login.mako")
@view_config(context=HTTPForbidden, renderer='auth/login.mako')
def login(request):
    form = LoginForm(request.POST)
    next = request.params.get('next', request.application_url)

    if request.method == 'POST' and form.validate():
        headers = remember(request, form.username.data.principal_id)

        return HTTPFound(location=next, headers=headers)

    return dict(form=form)


@view_config(route_name="auth.logout")
def logout(request):
    headers = forget(request)
    return HTTPFound(location=request.application_url, headers=headers)

def setup_pyramid(comp, config):

    def principal_dump(request):
        query = DBSession.query(Principal).with_polymorphic('*')
        result = []

        for p in query:
            result.append(dict(id=p.id, cls=p.cls, keyname=p.keyname, display_name=p.display_name))

        return result

    config.add_route('auth.principal_dump', '/auth/principal/dump')
    config.add_view(principal_dump, route_name='auth.principal_dump', renderer='json')