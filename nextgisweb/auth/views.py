# -*- coding: utf-8 -*-
from sqlalchemy.orm.exc import NoResultFound
from bunch import Bunch

from pyramid.httpexceptions import HTTPFound, HTTPForbidden
from pyramid.security import remember, forget

from ..object_widget import ObjectWidget
from ..views import ModelController, permalinker
from .. import dynmenu as dm


def setup_pyramid(comp, config):
    Principal = comp.Principal
    User = comp.User
    Group = comp.Group

    def check_permission(request):
        """ Чтобы избежать перекрестной зависимости двух компонентов -
        auth и security, права доступа к редактированию пользователей
        ограничиваются по критерию членства в группе administrators """

        if not request.user.is_administrator:
            raise HTTPForbidden("Membership in group 'administrators' required!")

    def login(request):
        next = request.params.get('next', request.application_url)

        if request.method == 'POST':
            try:
                user = User.filter_by(keyname=request.POST['login']).one()

                if user.password == request.POST['password']:
                    headers = remember(request, user.id)
                    return HTTPFound(location=next, headers=headers)
                else:
                    raise NoResultFound()

            except NoResultFound:
                pass

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
            return HTTPFound(
                location=request.route_url(
                    'auth.login',
                    _query=dict(next=request.url)
                )
            )

        # Уже аутентифицированным пользователям показываем сообщение об ошибке
        return dict(subtitle=u"Отказано в доступе")

    config.add_view(
        forbidden,
        context=HTTPForbidden,
        renderer='auth/forbidden.mako'
    )

    def principal_dump(request):
        query = Principal.query().with_polymorphic('*')
        result = []

        for p in query:
            result.append(dict(
                id=p.id,
                cls=p.cls,
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

        def validate(self):
            result = super(AuthGroupWidget, self).validate()
            self.error = []

            return result

        def widget_params(self):
            result = super(AuthGroupWidget, self).widget_params()

            if self.obj:
                result['value'] = dict(
                    display_name=self.obj.display_name,
                    keyname=self.obj.keyname,
                )

            return result

        def widget_module(self):
            return 'ngw/auth/GroupWidget'

    class GroupController(ModelController):

        def create_context(self, request):
            check_permission(request)
            return dict(
                template=dict(subtitle=u"Новая группа")
            )

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

            self.obj.display_name = self.data['display_name']
            self.obj.keyname = self.data['keyname']

            if self.data.get('password', None) is not None:
                self.obj.password = self.data['password']

            self.obj.member_of = map(
                lambda id: Group.filter_by(id=id).one(),
                self.data['member_of']
            )

        def validate(self):
            result = super(AuthUserWidget, self).validate()
            self.error = []

            return result

        def widget_params(self):
            result = super(AuthUserWidget, self).widget_params()

            if self.obj:
                result['value'] = dict(
                    display_name=self.obj.display_name,
                    keyname=self.obj.keyname,
                    member_of=[m.id for m in self.obj.member_of],
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
                # Список всех групп для поля выбора
                result['groups'] = [
                    dict(value=g.id, label=g.display_name)
                    for g in Group.query()
                ]

            return result

        def widget_module(self):
            return 'ngw/auth/UserWidget'

    class AuthUserModelController(ModelController):

        def create_context(self, request):
            check_permission(request)
            return dict(
                template=dict(subtitle=u"Новый пользователь")
            )

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
            obj_list=User.filter_by(system=False).order_by(User.display_name),
            dynmenu=User.__dynmenu__,
            dynmenu_kwargs=Bunch(request=request),
        )

    config.add_route('auth.user.browse', '/auth/user/') \
        .add_view(user_browse, renderer='auth/user_browse.mako')

    def group_browse(request):
        check_permission(request)
        return dict(
            obj_list=Group.filter_by(system=False).order_by(Group.display_name),
            dynmenu=Group.__dynmenu__,
            dynmenu_kwargs=Bunch(request=request),
        )

    config.add_route('auth.group.browse', '/auth/group/') \
        .add_view(group_browse, renderer='auth/group_browse.mako')

    class UserMenu(dm.DynItem):

        def build(self, kwargs):
            yield dm.Link(
                self.sub('browse'), u"Список",
                lambda kwargs: kwargs.request.route_url('auth.user.browse')
            )

            yield dm.Link(
                self.sub('create'), u"Создать",
                lambda kwargs: kwargs.request.route_url('auth.user.create')
            )

            if 'obj' in kwargs:
                yield dm.Link(
                    self.sub('edit'), u"Редактировать",
                    lambda kwargs: kwargs.request.route_url(
                        'auth.user.edit',
                        id=kwargs.obj.id
                    )
                )

    class GroupMenu(dm.DynItem):

        def build(self, kwargs):
            yield dm.Link(
                self.sub('browse'), u"Список",
                lambda kwargs: kwargs.request.route_url('auth.group.browse')
            )

            yield dm.Link(
                self.sub('create'), u"Создать",
                lambda kwargs: kwargs.request.route_url('auth.group.create')
            )

            if 'obj' in kwargs:
                yield dm.Link(
                    self.sub('edit'), u"Редактировать",
                    lambda kwargs: kwargs.request.route_url(
                        'auth.group.edit',
                        id=kwargs.obj.id
                    )
                )

    User.__dynmenu__ = UserMenu()
    Group.__dynmenu__ = GroupMenu()

    comp.env.pyramid.control_panel.add(
        dm.Label('auth-user', u"Пользователи"),
        UserMenu('auth-user'),

        dm.Label('auth-group', u"Группы пользователей"),
        GroupMenu('auth-group'),
    )
