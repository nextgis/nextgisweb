# -*- coding: utf-8 -*-
from sqlalchemy.orm.exc import NoResultFound

from pyramid.httpexceptions import HTTPUnauthorized, HTTPFound, HTTPForbidden
from pyramid.security import remember, forget

from ..object_widget import ObjectWidget
from ..views import ModelController, permalinker
from .. import dynmenu as dm

from .models import Principal, User, Group, UserDisabled

from .util import _


def setup_pyramid(comp, config):

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
                    if user.disabled:
                        return dict(error=_("Account disabled"))
                    return HTTPFound(location=next, headers=headers)
                else:
                    raise NoResultFound()

            except NoResultFound:
                return dict(error=_("Invalid login or password!"))

        return dict()

    config.add_route('auth.login', '/login') \
        .add_view(login, renderer='nextgisweb:auth/template/login.mako')

    def logout(request):
        headers = forget(request)
        return HTTPFound(location=request.application_url, headers=headers)

    config.add_route('auth.logout', '/logout').add_view(logout)

    def forbidden(request):
        # Если пользователь не аутентифицирован, то можно предложить ему войти
        # TODO: Возможно есть способ лучше проверить наличие аутентификации

        if request.user.keyname == 'guest':
            # Если URL начинается с /api/ и пользователь не аутентифицирован,
            # то скорее всего это не веб-интерфейс, а какой-то сторонний софт,
            # который возможно умеет HTTP аутентификацию. Скажем ему что мы
            # тоже умеем. Остальных переадресовываем на страницу логина.

            if request.path_info.startswith('/api/'):
                return HTTPUnauthorized(headers={
                    b'WWW-Authenticate': b'Basic realm="NextGISWeb"'})
            else:
                return HTTPFound(location=request.route_url(
                    'auth.login', _query=dict(next=request.url)))

        # Уже аутентифицированным пользователям показываем сообщение об ошибке
        # TODO: Отдельно можно информировать заблокированных пользователей
        request.response.status = 403
        return dict(subtitle=_("Access denied"))

    config.add_view(
        forbidden,
        context=HTTPForbidden,
        renderer='nextgisweb:auth/template/forbidden.mako')

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
                    description=self.obj.description)

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

            self.obj.display_name = self.data['display_name']
            self.obj.keyname = self.data['keyname']
            self.obj.superuser = self.data['superuser']
            self.obj.disabled = self.data['disabled']

            if self.data.get('password', None) is not None:
                self.obj.password = self.data['password']

            self.obj.member_of = map(
                lambda id: Group.filter_by(id=id).one(),
                self.data['member_of'])

            self.obj.description = self.data['description']

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
                # Список всех групп для поля выбора
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
