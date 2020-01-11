# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from sqlalchemy.orm.exc import NoResultFound

import json

from pyramid.response import Response
from pyramid.httpexceptions import HTTPUnauthorized, HTTPForbidden, HTTPUnprocessableEntity
from pyramid.security import remember, forget

from ..models import DBSession
from .models import User, Group


def user_cget(request):
    request.require_administrator()
    return map(lambda o: o.serialize(), User.query())


def user_cpost(request):
    request.require_administrator()
    obj = User(system=False)
    obj.deserialize(request.json_body)
    obj.persist()

    DBSession.flush()
    return dict(id=obj.id)


def user_iget(request):
    request.require_administrator()
    obj = User.filter_by(id=request.matchdict['id']).one()
    return obj.serialize()


def user_iput(request):
    request.require_administrator()
    obj = User.filter_by(id=request.matchdict['id']).one()
    obj.deserialize(request.json_body)
    return dict(id=obj.id)


def group_cget(request):
    request.require_administrator()
    return map(lambda o: o.serialize(), Group.query())


def group_cpost(request):
    request.require_administrator()
    obj = Group(system=False)
    obj.deserialize(request.json_body)
    obj.persist()

    DBSession.flush()
    return dict(id=obj.id)


def group_iget(request):
    request.require_administrator()
    obj = Group.filter_by(id=request.matchdict['id']).one()
    return obj.serialize()


def group_iput(request):
    request.require_administrator()
    obj = Group.filter_by(id=request.matchdict['id']).one()
    obj.deserialize(request.json_body)
    return dict(id=obj.id)


def current_user(request):
    return dict(
        id=request.user.id, keyname=request.user.keyname,
        display_name=request.user.display_name)


def register(request):
    if not request.env.auth.options['register']:
        raise HTTPForbidden("Anonymous registration is not allowed!")

    # For self-registration only certain attributes of the user are required
    rkeys = ('display_name', 'description', 'keyname', 'password')
    src = request.json_body
    data = dict()
    for k in rkeys:
        if k in src:
            data[k] = src[k]

    # Add groups automatically assigned on registration
    data['member_of'] = map(
        lambda group: group.id,
        Group.filter_by(register=True))

    obj = User(system=False)
    obj.deserialize(data)
    obj.persist()

    DBSession.flush()
    return dict(id=obj.id)


def login(request):
    if ('login' not in request.POST) or ('password' not in request.POST):
        return HTTPUnprocessableEntity()
    try:
        user = User.filter_by(keyname=request.POST['login'].strip()).one()
        if user.password == request.POST['password']:
            if user.disabled:
                return HTTPUnauthorized()

            headers = remember(request, user.id)

            return Response(
                json.dumps({
                    "keyname": user.keyname,
                    "display_name": user.display_name,
                    "description": user.description
                }), status_code=200,
                content_type=b'application/json',
                headers=headers
            )
        else:
            return HTTPUnauthorized()
    except NoResultFound:
        return HTTPUnauthorized()


def logout(request):
    headers = forget(request)
    return Response(json.dumps({}), headers=headers)


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

    config.add_route('auth.current_user', '/api/component/auth/current_user') \
        .add_view(current_user, request_method='GET', renderer='json')

    config.add_route('auth.register', '/api/component/auth/register') \
        .add_view(register, request_method='POST', renderer='json')

    config.add_route('auth.login_cookies', '/api/component/auth/login') \
        .add_view(login, request_method='POST', renderer='json')

    config.add_route('auth.logout_cookies', '/api/component/auth/logout') \
        .add_view(logout, request_method='POST', renderer='json')
