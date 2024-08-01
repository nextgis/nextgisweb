import warnings
from dataclasses import dataclass

import zope.event
import zope.event.classhandler
from msgspec import Meta
from pyramid.httpexceptions import HTTPBadRequest, HTTPFound
from pyramid.threadlocal import get_current_request
from sqlalchemy.orm import joinedload, with_polymorphic
from sqlalchemy.orm.exc import NoResultFound
from typing_extensions import Annotated

from nextgisweb.env import DBSession, env, gettext
from nextgisweb.lib.dynmenu import DynMenu, Label, Link

from nextgisweb.auth import OnUserLogin
from nextgisweb.core.exception import InsufficientPermissions
from nextgisweb.pyramid import JSONType, viewargs
from nextgisweb.pyramid.breadcrumb import Breadcrumb, breadcrumb_adapter
from nextgisweb.pyramid.psection import PageSections

from .exception import ResourceNotFound
from .extaccess import ExternalAccessLink
from .interface import IResourceBase
from .model import Resource
from .permission import Permission, Scope
from .scope import ResourceScope
from .widget import CompositeWidget

ResourceID = Annotated[int, Meta(ge=0, description="Resource ID")]


class ResourceFactory:
    def __init__(self, *, key="id", context=None):
        self.key = key
        self.context = context

    def __call__(self, request) -> Resource:
        # First, load base class resource
        res_id = request.path_param[self.key]
        try:
            (res_cls,) = DBSession.query(Resource.cls).where(Resource.id == res_id).one()
        except NoResultFound:
            raise ResourceNotFound(res_id)

        polymorphic = with_polymorphic(Resource, [Resource.registry[res_cls]])
        obj = (
            DBSession.query(polymorphic)
            .options(
                joinedload(polymorphic.owner_user),
                joinedload(polymorphic.parent),
            )
            .where(polymorphic.id == res_id)
            .one()
        )

        if context := self.context:
            if issubclass(context, Resource):
                if not isinstance(obj, context):
                    raise ResourceNotFound(res_id)
            elif issubclass(context, IResourceBase):
                if not context.providedBy(obj):
                    raise ResourceNotFound(res_id)
            else:
                raise NotImplementedError

        request.audit_context(res_cls, res_id)

        return obj

    @property
    def annotations(self):
        if context := self.context:
            if issubclass(context, Resource):
                description = f"{context.cls_display_name} resource ID"
            elif issubclass(context, IResourceBase):
                description = f"ID of resource providing {context.__name__} interface"
            else:
                raise NotImplementedError
            tdef = Annotated[ResourceID, Meta(description=description)]
        else:
            tdef = ResourceID
        return {self.key: tdef}


resource_factory = ResourceFactory()


@breadcrumb_adapter
def resource_breadcrumb(obj, request):
    if isinstance(obj, Resource):
        return Breadcrumb(
            label=obj.display_name,
            link=request.route_url("resource.show", id=obj.id),
            icon=f"rescls-{obj.cls}",
            parent=obj.parent,
        )


@viewargs(renderer="nextgisweb:pyramid/template/psection.mako")
def show(request):
    request.resource_permission(ResourceScope.read)
    return dict(obj=request.context, sections=request.context.__psection__)


def root(request):
    return HTTPFound(request.route_url("resource.show", id=0))


@viewargs(renderer="react")
def json_view(request):
    request.resource_permission(ResourceScope.read)
    return dict(
        entrypoint="@nextgisweb/resource/json-view",
        props=dict(id=request.context.id),
        title=gettext("JSON view"),
        obj=request.context,
        maxheight=True,
    )


@viewargs(renderer="react")
def effective_permisssions(request):
    request.resource_permission(ResourceScope.read)
    return dict(
        entrypoint="@nextgisweb/resource/effective-permissions",
        props=dict(resourceId=request.context.id),
        title=gettext("User permissions"),
        obj=request.context,
    )


# TODO: Move to API
def schema(request) -> JSONType:
    tr = request.translate
    resources = dict()
    scopes = dict()

    for identity, cls in Resource.registry.items():
        resources[identity] = dict(
            identity=identity,
            label=tr(cls.cls_display_name),
            scopes=list(cls.scope.keys()),
        )

    for k, scp in Scope.registry.items():
        spermissions = dict()
        for p in scp.values():
            spermissions[p.name] = dict(label=tr(p.label))

        scopes[k] = dict(
            identity=k,
            permissions=spermissions,
            label=tr(scp.label),
        )

    return dict(resources=resources, scopes=scopes)


@dataclass
class OnResourceCreateView:
    cls: str
    parent: Resource


@viewargs(renderer="composite_widget.mako")
def create(request):
    request.resource_permission(ResourceScope.manage_children)
    cls = request.GET.get("cls")
    zope.event.notify(OnResourceCreateView(cls=cls, parent=request.context))
    return dict(
        obj=request.context,
        title=gettext("Create resource"),
        maxheight=True,
        query=dict(operation="create", cls=cls, parent=request.context.id),
    )


@viewargs(renderer="composite_widget.mako")
def update(request):
    request.resource_permission(ResourceScope.update)
    return dict(
        obj=request.context,
        title=gettext("Update resource"),
        maxheight=True,
        query=dict(operation="update", id=request.context.id),
    )


@viewargs(renderer="react")
def delete(request):
    request.resource_permission(ResourceScope.read)
    return dict(
        entrypoint="@nextgisweb/resource/delete-page",
        props=dict(id=request.context.id),
        title=gettext("Delete resource"),
        obj=request.context,
        maxheight=True,
    )


def widget(request) -> JSONType:
    operation = request.GET.get("operation", None)
    resid = request.GET.get("id", None)
    clsid = request.GET.get("cls", None)
    parent_id = request.GET.get("parent", None)
    suggested_display_name = None

    if operation == "create":
        if resid is not None or clsid is None or parent_id is None:
            raise HTTPBadRequest()

        if clsid not in Resource.registry._dict:
            raise HTTPBadRequest()

        parent = with_polymorphic(Resource, "*").filter_by(id=parent_id).one()
        owner_user = request.user

        tr = request.localizer.translate
        obj = Resource.registry[clsid](parent=parent, owner_user=request.user)
        suggested_display_name = obj.suggest_display_name(tr)

    elif operation in ("update", "delete"):
        if resid is None or clsid is not None or parent_id is not None:
            raise HTTPBadRequest()

        obj = with_polymorphic(Resource, "*").filter_by(id=resid).one()

        clsid = obj.cls
        parent = obj.parent
        owner_user = obj.owner_user

    else:
        raise HTTPBadRequest()

    widget = CompositeWidget(operation=operation, obj=obj, request=request)
    return dict(
        operation=operation,
        config=widget.config(),
        id=resid,
        cls=clsid,
        parent=parent.id if parent else None,
        owner_user=owner_user.id,
        suggested_display_name=suggested_display_name,
    )


@viewargs(renderer="react")
def resource_export(request):
    request.require_administrator()
    return dict(
        entrypoint="@nextgisweb/resource/export-settings",
        title=gettext("Resource export"),
        dynmenu=request.env.pyramid.control_panel,
    )


def creatable_resources(parent, *, user):
    result = []
    options = env.resource.options
    permissions = parent.permissions(user)

    for ident, cls in Resource.registry._dict.items():
        if ident in options["disabled_cls"] or options["disable." + ident]:
            continue

        if not cls.check_parent(parent):
            continue

        # Is current user has permission to manage resource children?
        if ResourceScope.manage_children not in permissions:
            continue

        # Is current user has permission to create child resource?
        child = cls(parent=parent, owner_user=user)
        if not child.has_permission(ResourceScope.create, user):
            continue

        # Workaround SAWarning: Object of type ... not in session,
        # add operation along 'Resource.children' will not proceed
        child.parent = None

        result.append(cls)

    return result


resource_sections = PageSections("resource_section")


def setup_pyramid(comp, config):
    def resource_permission(request, permission, resource=None):
        if isinstance(resource, Permission):
            warnings.warn(
                "Deprecated argument order for resource_permission. "
                "Use request.resource_permission(permission, resource).",
                stacklevel=2,
            )

            permission, resource = resource, permission

        if resource is None:
            resource = request.context

        if not resource.has_permission(permission, request.user):
            raise InsufficientPermissions(
                message=gettext("Insufficient '%s' permission in scope '%s' on resource id = %d.")
                % (permission.name, permission.scope.identity, resource.id),
                data=dict(
                    resource=dict(id=resource.id),
                    permission=permission.name,
                    scope=permission.scope.identity,
                ),
            )

    config.add_request_method(resource_permission, "resource_permission")

    def _route(route_name, route_path, **kwargs):
        return config.add_route(
            "resource." + route_name,
            "/resource/" + route_path,
            **kwargs,
        )

    def _resource_route(route_name, route_path, **kwargs):
        return _route(
            route_name,
            route_path,
            factory=resource_factory,
            **kwargs,
        )

    _route("schema", "schema", get=schema)
    _route("root", "", get=root)
    _route("widget", "widget", get=widget)

    _resource_route("show", r"{id:uint}", get=show)
    _resource_route("json", r"{id:uint}/json", get=json_view)
    _resource_route("effective_permissions", r"{id:uint}/permissions", get=effective_permisssions)
    _resource_route("export.page", r"{id:uint}/export", request_method="GET")

    config.add_route(
        "resource.control_panel.resource_export",
        "/control-panel/resource-export",
        get=resource_export,
    )

    # CRUD
    _resource_route("create", r"{id:uint}/create", get=create)
    _resource_route("update", r"{id:uint}/update", get=update)
    _resource_route("delete", r"{id:uint}/delete", get=delete)

    # Sections

    # TODO: Deprecate, use resource_sections directly
    Resource.__psection__ = resource_sections

    @resource_sections(priority=0)
    def resource_section_main(obj):
        return True

    @resource_sections(priority=40)
    def resource_section_children(obj):
        return len(obj.children) > 0

    @resource_sections(priority=20)
    def resource_section_description(obj):
        return obj.description is not None

    @resource_sections()
    def resource_section_external_access(obj):
        items = list()
        request = get_current_request()
        for link in ExternalAccessLink.registry:
            if itm := link.factory(obj, request):
                items.append(itm)
        return dict(links=items) if len(items) > 0 else None

    # Actions
    Resource.__dynmenu__ = DynMenu(
        Label("create", gettext("Create resource")),
        Label("operation", gettext("Action")),
        Label("extra", gettext("Extra")),
    )

    @Resource.__dynmenu__.add
    def _resource_dynmenu(args):
        permissions = args.obj.permissions(args.request.user)

        if ResourceScope.update in permissions:
            yield Link(
                "operation/10-update",
                gettext("Update"),
                lambda args: args.request.route_url("resource.update", id=args.obj.id),
                important=True,
                icon="material-edit",
            )

        if (
            ResourceScope.delete in permissions
            and args.obj.id != 0
            and args.obj.parent.has_permission(ResourceScope.manage_children, args.request.user)
        ):
            yield Link(
                "operation/20-delete",
                gettext("Delete"),
                lambda args: args.request.route_url("resource.delete", id=args.obj.id),
                important=True,
                icon="material-delete",
            )

        if ResourceScope.read in permissions:
            yield Link(
                "extra/json",
                gettext("JSON view"),
                lambda args: args.request.route_url("resource.json", id=args.obj.id),
                icon="material-data_object",
            )

            yield Link(
                "extra/effective-permissions",
                gettext("User permissions"),
                lambda args: args.request.route_url(
                    "resource.effective_permissions",
                    id=args.obj.id,
                ),
                icon="material-key",
            )

    @comp.env.pyramid.control_panel.add
    def _control_panel(args):
        if args.request.user.is_administrator:
            yield Link(
                "settings/resource_export",
                gettext("Resource export"),
                lambda args: (args.request.route_url("resource.control_panel.resource_export")),
            )

    if comp.options["home.enabled"]:
        from .home import on_user_login

        zope.event.classhandler.handler(OnUserLogin)(on_user_login)

    from .favorite import view as favorite_view

    favorite_view.setup_pyramid(comp, config)
