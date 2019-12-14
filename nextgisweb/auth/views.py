# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import string
import secrets

from sqlalchemy.orm.exc import NoResultFound

from pyramid.events import BeforeRender
from pyramid.httpexceptions import HTTPUnauthorized, HTTPFound, HTTPBadRequest
from pyramid.security import remember, forget
from pyramid.renderers import render_to_response

from ..models import DBSession
from ..object_widget import ObjectWidget
from ..views import ModelController, permalinker
from .. import dynmenu as dm

from .models import Principal, User, Group, UserDisabled

from .util import _


def login(request):
    next_url = request.params.get('next', request.application_url)

    if request.method == 'POST':
        try:
            user = User.filter_by(
                keyname=request.POST['login'].strip()).one()

            if user.password == request.POST['password']:
                headers = remember(request, user.id)
                if user.disabled:
                    return dict(
                        error=_("Account disabled"),
                        next_url=next_url)
                return HTTPFound(location=next_url, headers=headers)
            else:
                raise NoResultFound()

        except NoResultFound:
            return dict(
                error=_("Invalid login or password!"),
                next_url=next_url)

    return dict(next_url=next_url)


def oauth(request):
    oaserver = request.env.auth.oauth

    oauth_url = request.route_url('auth.oauth')
    oauth_path = request.route_path('auth.oauth')

    def cookie_name(state):
        return 'ngw-oastate-' + state

    if 'error' in request.params:
        return render_error_message(request)

    elif 'code' in request.params and 'state' in request.params:
        # Extract next_url from state named cookie
        try:
            state = request.params['state']
            next_url = request.cookies[cookie_name(state)]
        except KeyError:
            raise HTTPBadRequest()

        access_token = oaserver.get_access_token(
            request.params['code'], oauth_url)

        user = oaserver.get_user(access_token)
        if user is None:
            return render_error_message(request)

        DBSession.flush()
        headers = remember(request, user.id)

        response = HTTPFound(location=next_url, headers=headers)
        response.delete_cookie(cookie_name(state), path=oauth_path)

        return response

    else:
        next_url = request.params.get('next', request.application_url)

        alphabet = string.ascii_letters + string.digits
        state = ''.join(secrets.choice(alphabet) for i in range(16))
        ac_url = oaserver.authorization_code_url(oauth_url, state=state)

        response = HTTPFound(location=ac_url)

        # Store next_url in state named cookie
        response.set_cookie(
            cookie_name(state), value=next_url,
            path=oauth_path, max_age=600, httponly=True)

        return response


def logout(request):
    headers = forget(request)
    return HTTPFound(location=request.application_url, headers=headers)


def render_error_message(request, message=None):
    if message is None:
        message = _("Insufficient permissions to perform this operation.")
    response = render_to_response(
        'nextgisweb:auth/template/error.mako',
        dict(
            subtitle=_("Access denied"),
            message=message
        ), request=request)
    response.status = 403
    return response


def forbidden_error_response(request, err_info, exc, exc_info, **kwargs):
    # If user is not authentificated, we can offer him to sign in
    # TODO: there may be a better way to check if authentificated

    if request.user.keyname == 'guest':
        # If URL starts with /api/ and user is not authentificated,
        # then it's probably not a web-interface, but external software,
        # that can do HTTP auth. Tell it that we can do too.
        if request.is_api:
            return HTTPUnauthorized(headers={
                b'WWW-Authenticate': b'Basic realm="NextGISWeb"'})

        # Others are redirected to login page.
        elif request.method == 'GET':
            response = render_to_response(
                'nextgisweb:auth/template/login.mako',
                dict(next_url=request.url), request=request)
            response.status = 403
            return response

    # Show error message to already authentificated users
    # TODO: We can separately inform blocked users

    return render_error_message(request)


def setup_pyramid(comp, config):
    def forbidden_error_handler(request, err_info, exc, exc_info, **kwargs):
        if err_info.http_status_code == 403:
            return forbidden_error_response(request, err_info, exc, exc_info, **kwargs)

    comp.env.pyramid.error_handlers.append(forbidden_error_handler)

    def check_permission(request):
        """ To avoid interdependency of two components:
        auth and security, permissions to edit users
        are limited by administrators group membership criterion"""

        request.require_administrator()

    config.add_route('auth.login', '/login') \
        .add_view(login, renderer='nextgisweb:auth/template/login.mako')

    config.add_route('auth.logout', '/logout').add_view(logout)

    config.add_route('auth.oauth', '/oauth').add_view(oauth)

    def user_disabled(request):
        headers = forget(request)
        return HTTPFound(location=request.application_url, headers=headers)

    config.add_view(user_disabled, context=UserDisabled)

    def principal_dump(request):
        query = Principal.query().with_polymorphic('*')
        result = []

        for p in query:
            result.append(dict(
                id=p.id,
                cls=p.cls,
                system=p.system,
                keyname=p.keyname,
                display_name=p.display_name
            ))

        return result

    config.add_route('auth.principal_dump', '/auth/principal/dump') \
        .add_view(principal_dump, renderer='json')

    class AuthGroupWidget(ObjectWidget):

        def is_applicable(self):
            return self.operation in ('create', 'edit')

        def populate_obj(self):
            super(AuthGroupWidget, self).populate_obj()

            self.obj.display_name = self.data['display_name']
            self.obj.keyname = self.data['keyname']
            self.obj.description = self.data['description']
            self.obj.register = self.data['register']

            self.obj.members = [User.filter_by(id=id).one()
                                for id in self.data['members']]

        def validate(self):
            result = super(AuthGroupWidget, self).validate()
            self.error = []

            if self.operation == 'create':
                conflict = Group.filter_by(
                    keyname=self.data.get("keyname")).first()
                if conflict:
                    result = False
                    self.error.append(dict(
                        message=self.request.localizer.translate(
                            _("Group name is not unique."))))

            return result

        def widget_params(self):
            result = super(AuthGroupWidget, self).widget_params()

            if self.obj:
                result['value'] = dict(
                    display_name=self.obj.display_name,
                    keyname=self.obj.keyname,
                    description=self.obj.description,
                    register=self.obj.register)

                result['users'] = [
                    dict(
                        value=u.id,
                        label=u.display_name,
                        selected=u in self.obj.members
                    ) for u in User.filter_by(system=False)]

            else:
                # List of all users for selector
                result['users'] = [
                    dict(value=u.id, label=u.display_name)
                    for u in User.filter_by(system=False)
                ]

            return result

        def widget_module(self):
            return 'ngw-auth/GroupWidget'

    class GroupController(ModelController):

        def create_context(self, request):
            check_permission(request)
            return dict(template=dict(
                subtitle=_("Create new group"),
                dynmenu=Group.__dynmenu__))

        def edit_context(self, request):
            check_permission(request)
            obj = Group.filter_by(**request.matchdict) \
                .filter_by(system=False).one()

            return dict(
                obj=obj,
                template=dict(obj=obj)
            )

        def create_object(self, context):
            return Group()

        def query_object(self, context):
            return context['obj']

        def widget_class(self, context, operation):
            return AuthGroupWidget

        def template_context(self, context):
            return context['template']

    GroupController('auth.group', '/auth/group').includeme(config)

    class AuthUserWidget(ObjectWidget):

        def is_applicable(self):
            return self.operation in ('create', 'edit')

        def populate_obj(self):
            super(AuthUserWidget, self).populate_obj()

            self.obj.display_name = self.data.get('display_name')
            self.obj.keyname = self.data.get('keyname')
            self.obj.superuser = self.data.get('superuser', False)
            self.obj.disabled = self.data.get('disabled', False)

            if self.data.get('password', None) is not None:
                self.obj.password = self.data['password']

            self.obj.member_of = [Group.filter_by(id=id).one()
                                  for id in self.data['member_of']]

            self.obj.description = self.data['description']

        def validate(self):
            result = super(AuthUserWidget, self).validate()
            self.error = []

            if self.operation == 'create':
                conflict = User.filter_by(
                    keyname=self.data.get("keyname")).first()
                if conflict:
                    result = False
                    self.error.append(dict(
                        message=self.request.localizer.translate(
                            _("Login is not unique."))))

            return result

        def widget_params(self):
            result = super(AuthUserWidget, self).widget_params()

            if self.obj:
                result['value'] = dict(
                    display_name=self.obj.display_name,
                    keyname=self.obj.keyname,
                    superuser=self.obj.superuser,
                    disabled=self.obj.disabled,
                    member_of=[m.id for m in self.obj.member_of],
                    description=self.obj.description,
                )
                result['groups'] = [
                    dict(
                        value=g.id,
                        label=g.display_name,
                        selected=g in self.obj.member_of
                    )
                    for g in Group.query()
                ]

            else:
                # List of all groups to selection field
                result['groups'] = [
                    dict(value=g.id, label=g.display_name)
                    for g in Group.query()
                ]

            return result

        def widget_module(self):
            return 'ngw-auth/UserWidget'

    class AuthUserModelController(ModelController):

        def create_context(self, request):
            check_permission(request)
            return dict(template=dict(
                subtitle=_("Create new user"),
                dynmenu=User.__dynmenu__))

        def edit_context(self, request):
            check_permission(request)
            obj = User.filter_by(**request.matchdict) \
                .filter_by(system=False).one()

            return dict(
                obj=obj,
                template=dict(obj=obj)
            )

        def create_object(self, context):
            return User()

        def query_object(self, context):
            return context['obj']

        def widget_class(self, context, operation):
            return AuthUserWidget

        def template_context(self, context):
            return context['template']

    AuthUserModelController('auth.user', '/auth/user').includeme(config)

    permalinker(Group, "auth.group.edit")
    permalinker(User, "auth.user.edit")

    def user_browse(request):
        check_permission(request)
        return dict(
            title=_("Users"),
            obj_list=User.filter_by(system=False).order_by(User.display_name),
            dynmenu=request.env.pyramid.control_panel)

    config.add_route('auth.user.browse', '/auth/user/') \
        .add_view(user_browse, renderer='nextgisweb:auth/template/user_browse.mako')

    def group_browse(request):
        check_permission(request)
        return dict(
            title=_("Groups"),
            obj_list=Group.filter_by(system=False).order_by(Group.display_name),
            dynmenu=request.env.pyramid.control_panel)

    config.add_route('auth.group.browse', '/auth/group/') \
        .add_view(group_browse, renderer='nextgisweb:auth/template/group_browse.mako')

    class UserMenu(dm.DynItem):

        def build(self, kwargs):
            yield dm.Link(
                self.sub('browse'), _("List"),
                lambda kwargs: kwargs.request.route_url('auth.user.browse')
            )

            yield dm.Link(
                self.sub('create'), _("Create"),
                lambda kwargs: kwargs.request.route_url('auth.user.create')
            )

            if 'obj' in kwargs and isinstance(kwargs.obj, User):
                yield dm.Link(
                    self.sub('edit'), _("Edit"),
                    lambda kwargs: kwargs.request.route_url(
                        'auth.user.edit',
                        id=kwargs.obj.id
                    )
                )

    class GroupMenu(dm.DynItem):

        def build(self, kwargs):
            yield dm.Link(
                self.sub('browse'), _("List"),
                lambda kwargs: kwargs.request.route_url('auth.group.browse')
            )

            yield dm.Link(
                self.sub('create'), _("Create"),
                lambda kwargs: kwargs.request.route_url('auth.group.create')
            )

            if 'obj' in kwargs and isinstance(kwargs.obj, Group):
                yield dm.Link(
                    self.sub('edit'), _("Edit"),
                    lambda kwargs: kwargs.request.route_url(
                        'auth.group.edit',
                        id=kwargs.obj.id
                    )
                )

    User.__dynmenu__ = comp.env.pyramid.control_panel
    Group.__dynmenu__ = comp.env.pyramid.control_panel

    comp.env.pyramid.control_panel.add(
        dm.Label('auth-user', _("Users")),
        UserMenu('auth-user'),

        dm.Label('auth-group', _("Groups")),
        GroupMenu('auth-group'),
    )

    # Login and logout routes names
    def add_globals(event):
        event['login_route_name'] = comp.options['login_route_name']
        event['logout_route_name'] = comp.options['logout_route_name']

    config.add_subscriber(add_globals, BeforeRender)
