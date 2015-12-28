# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import

from pyramid.httpexceptions import HTTPForbidden

from ..models import DBSession
from .models import User, Group


def require_administrator(request):
    if not request.user.is_administrator:
        raise HTTPForbidden("Membership in group 'administrators' required!")


def user_cget(request):
    require_administrator(request)
    return map(lambda o: o.serialize(), User.query())


def user_cpost(request):
    data = request.json_body
    comp = request.env.auth

    if not request.user.is_administrator and comp.settings_register:
        # При самостоятельной регистрации могут быть указаны только
        # некоторые атрибуты пользователя.
        rkeys = ('display_name', 'description', 'keyname', 'password')
        ndata = dict()
        for k in rkeys:
            if k in data:
                ndata[k] = data[k]
        data = ndata

        # Добавляем группы, автоматически назначаемые при регистрации
        data['member_of'] = map(
            lambda group: group.id,
            Group.filter_by(register=True))
    else:
        require_administrator(request)

    obj = User(system=False)
    obj.deserialize(data)
    obj.persist()

    DBSession.flush()

    return dict(id=obj.id)


def user_iget(request):
    require_administrator(request)
    obj = User.filter_by(id=request.matchdict['id']).one()
    return obj.serialize()


def user_iput(request):
    require_administrator(request)
    obj = User.filter_by(id=request.matchdict['id']).one()
    obj.deserialize(request.json_body)
    return dict(id=obj.id)


def group_cget(request):
    require_administrator(request)
    return map(lambda o: o.serialize(), Group.query())


def group_cpost(request):
    require_administrator(request)
    obj = Group(system=False)
    obj.deserialize(request.json_body)
    obj.persist()

    DBSession.flush()

    return dict(id=obj.id)


def group_iget(request):
    require_administrator(request)
    obj = Group.filter_by(id=request.matchdict['id']).one()
    return obj.serialize()


def group_iput(request):
    require_administrator(request)
    obj = Group.filter_by(id=request.matchdict['id']).one()
    obj.deserialize(request.json_body)
    return dict(id=obj.id)


def setup_pyramid(comp, config):
    config.add_route('auth.user.collection', '/api/component/auth/user/') \
        .add_view(user_cget, request_method='GET', renderer='json') \
        .add_view(user_cpost, request_method='POST', renderer='json')

    config.add_route('auth.user.item', '/api/component/auth/user/{id}') \
        .add_view(user_iget, request_method='GET', renderer='json') \
        .add_view(user_iput, request_method='PUT', renderer='json')

    config.add_route('auth.group.collection', '/api/component/auth/group/') \
        .add_view(group_cget, request_method='GET', renderer='json') \
        .add_view(group_cpost, request_method='POST', renderer='json')

    config.add_route('auth.group.item', '/api/component/auth/group/{id}') \
        .add_view(group_iget, request_method='GET', renderer='json') \
        .add_view(group_iput, request_method='PUT', renderer='json')
