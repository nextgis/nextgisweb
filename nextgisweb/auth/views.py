# -*- coding: utf-8 -*-
from pyramid.httpexceptions import HTTPFound, HTTPForbidden
from pyramid.security import remember, forget

from ..models import DBSession

from .models import Principal, User


def query_users():
    return DBSession.query(User).filter_by(system=False)


def setup_pyramid(comp, config):

    def login(request):
        next = request.params.get('next', request.application_url)

        if request.method == 'POST':
            user = User.filter_by(keyname=request.POST['login']).one()
            headers = remember(request, user.id)

            return HTTPFound(location=next, headers=headers)

        return dict()

    config.add_route('auth.login', '/login') \
        .add_view(login, renderer='auth/login.mako')
    
    def logout(request):
        headers = forget(request)
        return HTTPFound(location=request.application_url, headers=headers)

    config.add_route('auth.logout', '/logout').add_view(logout)

    def forbidden(request):
        # Если это гость, то аутентификация может ему помочь
        if request.user.keyname == 'guest':
            return HTTPFound(location=request.route_url('auth.login'))

        # Уже аутентифицированным пользователям показываем сообщение об ошибке
        return dict(subtitle=u"Отказано в доступе")

    config.add_view(forbidden, context=HTTPForbidden, renderer='auth/forbidden.mako')

    def principal_dump(request):
        query = Principal.query().with_polymorphic('*')
        result = []

        for p in query:
            result.append(dict(id=p.id, cls=p.cls, keyname=p.keyname, display_name=p.display_name))

        return result

    config.add_route('auth.principal_dump', '/auth/principal/dump') \
        .add_view(principal_dump, renderer='json')