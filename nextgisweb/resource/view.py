import warnings
from dataclasses import dataclass
from types import SimpleNamespace

import zope.event
import zope.event.classhandler
from msgspec import Meta
from pyramid.httpexceptions import HTTPFound
from sqlalchemy.orm import joinedload, with_polymorphic
from sqlalchemy.orm.exc import NoResultFound
from typing_extensions import Annotated

from nextgisweb.env import DBSession, env, gettext
from nextgisweb.lib import dynmenu as dm
from nextgisweb.lib.dynmenu import DynMenu, Label, Link

from nextgisweb.auth import OnUserLogin
from nextgisweb.core.exception import InsufficientPermissions
from nextgisweb.gui import react_renderer
from nextgisweb.jsrealm import icon, jsentry
from nextgisweb.pyramid import JSONType
from nextgisweb.pyramid.breadcrumb import Breadcrumb, breadcrumb_adapter

from .event import OnChildClasses, OnDeletePrompt
from .exception import ResourceNotFound
from .extaccess import ExternalAccessLink
from .interface import IResourceBase
from .model import Resource
from .permission import Permission, Scope
from .psection import PageSections
from .scope import ResourceScope

RESOURCE_FILTER_JSENTRY = jsentry("@nextgisweb/resource/resources-filter")

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


@react_renderer("@nextgisweb/resource/page/show")
def show(request):
    request.resource_permission(ResourceScope.read)
    obj = request.context

    sections = list()
    for section in resource_sections:
        if not (ctx := section.callback(obj, request=request)):
            continue
        if not isinstance(ctx, dict):
            ctx = dict()
        sections.append({"module": section.jsentry, "props": ctx})

    props = {"resourceId": obj.id, "sectionsConfig": sections}
    return dict(
        props=props,
        obj=request.context,
    )


def root(request):
    return HTTPFound(request.route_url("resource.show", id=0))


@react_renderer("@nextgisweb/resource/json-view")
def json_view(request):
    request.resource_permission(ResourceScope.read)
    return dict(
        props=dict(id=request.context.id),
        title=gettext("JSON view"),
        obj=request.context,
        maxheight=True,
    )


@react_renderer("@nextgisweb/resource/effective-permissions")
def effective_permisssions(request):
    request.resource_permission(ResourceScope.read)
    return dict(
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


@react_renderer("@nextgisweb/resource/composite")
def create(request):
    request.resource_permission(ResourceScope.manage_children)
    cls = request.GET.get("cls")
    zope.event.notify(OnResourceCreateView(cls=cls, parent=request.context))
    setup = dict(operation="create", cls=cls, parent=request.context.id)
    return dict(
        props=dict(setup=setup),
        obj=request.context,
        title=gettext("Create resource"),
        maxheight=True,
    )


@react_renderer("@nextgisweb/resource/composite")
def update(request):
    request.resource_permission(ResourceScope.update)
    setup = dict(operation="update", id=request.context.id)
    return dict(
        props=dict(setup=setup),
        obj=request.context,
        title=gettext("Update resource"),
        maxheight=True,
    )


@react_renderer("@nextgisweb/resource/delete-page")
def delete(request):
    request.resource_permission(ResourceScope.read)
    return dict(
        # Delete page is universal for multiple resources deletion which is why resources is an array
        props=dict(resources=[request.context.id], navigateToId=request.context.parent.id),
        title=gettext("Delete resource"),
        obj=request.context,
        maxheight=True,
    )


@react_renderer("@nextgisweb/resource/export-settings")
def resource_export(request):
    request.require_administrator()
    return dict(
        title=gettext("Resource export"),
        dynmenu=request.env.pyramid.control_panel,
    )


def creatable_resources(parent, *, user):
    result = []

    permissions = parent.permissions(user)
    if ResourceScope.manage_children not in permissions:
        return result

    disabled_resource_cls = env.resource.disabled_resource_cls

    classes = set(
        cls
        for cls in Resource.registry.values()
        if (cls.identity not in disabled_resource_cls and cls.check_parent(parent))
    )

    if len(classes) == 0:
        return result

    classes = OnChildClasses.apply(parent=parent, classes=classes)

    for cls in classes:
        # Create a temporary resource to perform the remaining checks
        # TODO: It shouldn't be added to a session! Double-check it.
        child = cls(parent=parent, owner_user=user)

        if not parent.check_child(child):
            continue

        if not child.has_permission(ResourceScope.create, user):
            continue

        # Workaround SAWarning: Object of type ... not in session,
        # add operation along 'Resource.children' will not proceed
        child.parent = None

        result.append(cls)

    return result


# Sections

resource_sections = PageSections("resource_section")


@resource_sections("@nextgisweb/resource/resource-section/main", order=-100)
def resource_section_main(obj, *, request, **kwargs):
    tr = request.localizer.translate

    result = {"resourceId": obj.id}

    summary = result["summary"] = []
    summary.append((tr(gettext("Type")), f"{tr(obj.cls_display_name)} ({obj.cls})"))
    if keyname := obj.keyname:
        summary.append((tr(gettext("Keyname")), keyname))

    if get_info := getattr(obj, "get_info", None):
        for key, value in get_info():
            summary.append((tr(key), str(tr(value))))

    summary.append((tr(gettext("Owner")), tr(obj.owner_user.display_name_i18n)))

    result["creatable"] = [c.identity for c in creatable_resources(obj, user=request.user)]

    return result


@resource_sections("@nextgisweb/resource/resource-section/children", order=-50)
def resource_section_children(obj, *, request, **kwargs):
    if len(obj.children) == 0:
        return

    tr = request.localizer.translate

    resources = [
        resource
        for resource in obj.children
        if (ResourceScope.read in resource.permissions(request.user))
    ]

    resources.sort(key=lambda res: (res.cls_order, res.display_name))

    payload = list()
    for item in resources:
        idata = dict(
            id=item.id,
            displayName=item.display_name,
            cls=item.cls,
            clsDisplayName=tr(item.cls_display_name),
            creationDate=item.creation_date,
            ownerUserDisplayName=tr(item.owner_user.display_name_i18n),
        )

        iacts = idata["actions"] = list()
        args = SimpleNamespace(obj=item, request=request)
        for menu_item in item.__dynmenu__.build(args):
            if (
                isinstance(menu_item, dm.Link)
                and menu_item.important
                and menu_item.icon is not None
            ):
                iacts.append(
                    dict(
                        href=menu_item.url(args),
                        target=menu_item.target,
                        title=tr(menu_item.label),
                        icon=menu_item.icon,
                        key=menu_item.key,
                    )
                )

        payload.append(idata)

    return {"resourceChildren": payload}


@resource_sections("@nextgisweb/resource/resource-section/description", order=-60)
def resource_section_description(obj, **kwargs):
    return bool(obj.description)


@resource_sections("@nextgisweb/resource/resource-section/external-access")
def resource_section_external_access(obj, *, request, **kwargs):
    tr = request.localizer.translate

    external_docs_links = request.env.pyramid.options["nextgis_external_docs_links"]
    links = list()
    for link in ExternalAccessLink.registry:
        if itm := link.factory(obj, request):
            links.append(
                dict(
                    title=tr(itm.title),
                    help=tr(itm.help) if itm.help else None,
                    docsUrl=itm.docs_url if external_docs_links else None,
                    url=itm.url,
                )
            )
    return {"links": links} if len(links) > 0 else None


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

    # Actions

    Resource.__dynmenu__ = DynMenu(
        Label("create", gettext("Create resource")),
        Label("operation", gettext("Action")),
        Label("extra", gettext("Extra")),
    )

    icon_edit = icon("material/edit")
    icon_delete = icon("material/delete")
    icon_json = icon("material/data_object")
    icon_effective_permissions = icon("material/key")

    @Resource.__dynmenu__.add
    def _resource_dynmenu(args):
        permissions = args.obj.permissions(args.request.user)

        if ResourceScope.update in permissions:
            yield Link(
                "operation/10-update",
                gettext("Update"),
                lambda args: args.request.route_url("resource.update", id=args.obj.id),
                important=True,
                icon=icon_edit,
            )

        if (
            ResourceScope.delete in permissions
            and args.obj.id != 0
            and args.obj.parent.has_permission(ResourceScope.manage_children, args.request.user)
            and OnDeletePrompt.apply(args.obj)
        ):
            yield Link(
                "operation/20-delete",
                gettext("Delete"),
                lambda args: args.request.route_url("resource.delete", id=args.obj.id),
                important=True,
                icon=icon_delete,
            )

        if ResourceScope.read in permissions:
            yield Link(
                "extra/json",
                gettext("JSON view"),
                lambda args: args.request.route_url("resource.json", id=args.obj.id),
                icon=icon_json,
            )

            yield Link(
                "extra/effective-permissions",
                gettext("User permissions"),
                lambda args: args.request.route_url(
                    "resource.effective_permissions",
                    id=args.obj.id,
                ),
                icon=icon_effective_permissions,
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
