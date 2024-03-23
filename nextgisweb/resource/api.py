from typing import TYPE_CHECKING, Any, Dict, List, Literal, Mapping, Union, cast, get_args

import zope.event
from msgspec import UNSET, Meta, Struct, UnsetType, defstruct
from sqlalchemy.sql import exists
from sqlalchemy.sql.operators import ilike_op
from typing_extensions import Annotated

from nextgisweb.env import DBSession, _
from nextgisweb.lib import db
from nextgisweb.lib.apitype import AnyOf, EmptyObject, StatusCode, annotate

from nextgisweb.auth import User
from nextgisweb.auth.api import UserID
from nextgisweb.core.exception import InsufficientPermissions, ValidationError
from nextgisweb.jsrealm import TSExport
from nextgisweb.pyramid import AsJSON, JSONType
from nextgisweb.pyramid.api import csetting, require_storage_enabled

from .composite import CompositeSerializer
from .events import AfterResourceCollectionPost, AfterResourcePut
from .exception import HierarchyError, QuotaExceeded
from .model import Resource
from .presolver import ExplainACLRule, ExplainDefault, ExplainRequirement, PermissionResolver
from .sattribute import ResourceRefOptional, ResourceRefWithParent
from .scope import ResourceScope, Scope
from .view import resource_factory

PERM_READ = ResourceScope.read
PERM_DELETE = ResourceScope.delete
PERM_MCHILDREN = ResourceScope.manage_children
PERM_CPERM = ResourceScope.change_permissions


class BlueprintResource(Struct):
    identity: str
    label: str
    base_classes: List[str]
    interfaces: List[str]
    scopes: List[str]


class BlueprintPermission(Struct):
    identity: str
    label: str


class BlueprintScope(Struct):
    identity: str
    label: str
    permissions: Dict[str, BlueprintPermission]


class Blueprint(Struct):
    resources: Dict[str, BlueprintResource]
    scopes: Dict[str, BlueprintScope]


def blueprint(request) -> Blueprint:
    tr = request.translate
    return Blueprint(
        resources={
            identity: BlueprintResource(
                identity=identity,
                label=tr(cls.cls_display_name),
                base_classes=list(
                    reversed(
                        [
                            bc.identity
                            for bc in cls.__mro__
                            if (bc != cls and issubclass(bc, Resource))
                        ]
                    )
                ),
                interfaces=[i.__name__ for i in cls.implemented_interfaces()],
                scopes=list(cls.scope.keys()),
            )
            for identity, cls in Resource.registry.items()
        },
        scopes={
            sid: BlueprintScope(
                identity=sid,
                label=tr(scope.label),
                permissions={
                    perm.name: BlueprintPermission(
                        identity=perm.name,
                        label=tr(perm.label),
                    )
                    for perm in scope.values()
                },
            )
            for sid, scope in Scope.registry.items()
        },
    )


if TYPE_CHECKING:
    CompositCreate = Struct
    CompositeRead = Struct
    CompositeUpdate = Struct
else:
    composite = CompositeSerializer.types()
    CompositCreate = composite.create
    CompositeRead = composite.read
    CompositeUpdate = composite.update


def item_get(context, request) -> CompositeRead:
    """Read resource"""
    request.resource_permission(PERM_READ)

    serializer = CompositeSerializer(user=request.user)
    return serializer.serialize(context, CompositeRead)


def item_put(context, request, body: CompositeUpdate) -> EmptyObject:
    """Update resource"""
    request.resource_permission(PERM_READ)

    serializer = CompositeSerializer(user=request.user)
    with DBSession.no_autoflush:
        serializer.deserialize(context, body)

    zope.event.notify(AfterResourcePut(context, request))


def item_delete(context, request) -> EmptyObject:
    """Delete resource"""

    def delete(obj):
        request.resource_permission(PERM_DELETE, obj)
        request.resource_permission(PERM_MCHILDREN, obj)

        for chld in obj.children:
            delete(chld)

        DBSession.delete(obj)

    if context.id == 0:
        raise HierarchyError(message=_("Root resource could not be deleted."))

    with DBSession.no_autoflush:
        delete(context)

    DBSession.flush()


def collection_get(
    request,
    *,
    parent: Union[int, None] = None,
) -> AsJSON[List[CompositeRead]]:
    """Read children resources"""
    query = (
        Resource.query()
        .filter_by(parent_id=parent)
        .order_by(Resource.display_name)
        .options(db.subqueryload(Resource.acl))
    )

    serializer = CompositeSerializer(user=request.user)
    result = list()
    for resource in query:
        if resource.has_permission(PERM_READ, request.user):
            result.append(serializer.serialize(resource, CompositeRead))

    serializer = CompositeSerializer(user=request.user)
    check_perm = lambda res, u=request.user: res.has_permission(PERM_READ, u)
    return [serializer.serialize(res, CompositeRead) for res in query if check_perm(res)]


def collection_post(
    request,
    body: CompositCreate,
    *,
    cls: Union[str, UnsetType] = UNSET,
    parent: Union[int, UnsetType] = UNSET,
) -> Annotated[ResourceRefWithParent, StatusCode(201)]:
    """Create resource"""
    request.env.core.check_storage_limit()

    if body.resource is UNSET:
        resource_type = CompositCreate.__annotations__["resource"]
        resource_struct = get_args(resource_type)[0]
        body.resource = resource_struct()

    resource = body.resource

    if cls is not UNSET:
        resource.cls = cls

    if parent is not UNSET:
        resource.parent = dict(id=parent)
    elif resource.parent is UNSET:
        raise ValidationError(_("Resource parent required."))

    resource_cls = resource.cls

    if resource_cls is UNSET:
        raise ValidationError(message=_("Resource class required."))
    elif resource_cls not in Resource.registry:
        raise ValidationError(_("Unknown resource class '%s'.") % resource_cls)
    elif (
        resource_cls in request.env.resource.options["disabled_cls"]
        or request.env.resource.options["disable." + resource_cls]
    ):
        raise ValidationError(_("Resource class '%s' disabled.") % resource_cls)

    resource = Resource.registry[resource_cls](owner_user=request.user)
    serializer = CompositeSerializer(user=request.user)

    resource.persist()
    with DBSession.no_autoflush:
        serializer.deserialize(resource, body)

    DBSession.flush()

    request.audit_context("resource", resource.id)
    zope.event.notify(AfterResourceCollectionPost(resource, request))

    request.response.status_code = 201
    parent_ref = ResourceRefOptional(id=resource.parent.id)
    return ResourceRefWithParent(id=resource.id, parent=parent_ref)


if TYPE_CHECKING:
    scope_permissions_struct: Mapping[str, Any] = dict()

    class EffectivePermissions(Struct, kw_only=True):
        pass

else:
    scope_permissions_struct = dict()
    for sid, scope in Scope.registry.items():
        struct = defstruct(
            f"{scope.__name__}Permissions",
            [
                (
                    perm.name,
                    annotate(bool, [Meta(description=f"{scope.label}: {perm.label}")]),
                )
                for perm in scope.values()
            ],
            module=scope.__module__,
        )
        struct = annotate(struct, [Meta(description=str(scope.label))])
        scope_permissions_struct[sid] = struct

    EffectivePermissions = defstruct(
        "EffectivePermissions",
        [
            ((sid, struct) if sid == "resource" else (sid, Union[(struct, UnsetType)], UNSET))
            for sid, struct in scope_permissions_struct.items()
        ],
    )


def permission(
    resource,
    request,
    *,
    user: Union[UserID, None] = None,
) -> EffectivePermissions:
    """Get resource effective permissions"""
    request.resource_permission(PERM_READ)

    user_obj = User.filter_by(id=user).one() if (user is not None) else request.user
    if user_obj.id != request.user.id:
        request.resource_permission(PERM_CPERM)

    effective = resource.permissions(user_obj)
    return EffectivePermissions(
        **{
            sid: scope_permissions_struct[sid](
                **{p.name: (p in effective) for p in scope.values()},
            )
            for sid, scope in resource.scope.items()
        }
    )


def permission_explain(request) -> JSONType:
    request.resource_permission(PERM_READ)

    req_scope = request.params.get("scope")
    req_permission = request.params.get("permission")

    req_user_id = request.params.get("user")
    user = User.filter_by(id=req_user_id).one() if req_user_id is not None else request.user
    other_user = user != request.user
    if other_user:
        request.resource_permission(PERM_CPERM)

    resource = request.context

    if req_scope is not None or req_permission is not None:
        permissions = list()
        for perm in resource.class_permissions():
            if req_scope is None or perm.scope.identity == req_scope:
                if req_permission is None or perm.name == req_permission:
                    permissions.append(perm)
        if len(permissions) == 0:
            raise ValidationError(_("Permission not found"))
    else:
        permissions = None

    resolver = PermissionResolver(request.context, user, permissions, explain=True)

    def _jsonify_principal(principal):
        result = dict(id=principal.id)
        result["cls"] = {"U": "user", "G": "group"}[principal.cls]
        if principal.system:
            result["keyname"] = principal.keyname
        return result

    def _explain_jsonify(value):
        if value is None:
            return None

        result = dict()
        for scope_identity, scope in value.resource.scope.items():
            n_scope = result.get(scope_identity)
            for perm in scope.values():
                if perm in value._result:
                    if n_scope is None:
                        n_scope = result[scope_identity] = dict()
                    n_perm = n_scope[perm.name] = dict()
                    n_perm["result"] = value._result[perm]
                    n_explain = n_perm["explain"] = list()
                    for item in value._explanation[perm]:
                        i_res = item.resource

                        n_item = dict(
                            result=item.result,
                            resource=dict(id=i_res.id) if i_res else None,
                        )

                        n_explain.append(n_item)
                        if isinstance(item, ExplainACLRule):
                            n_item["type"] = "acl_rule"
                            if i_res.has_permission(PERM_READ, request.user):
                                n_item["acl_rule"] = {
                                    "action": item.acl_rule.action,
                                    "principal": _jsonify_principal(item.acl_rule.principal),
                                    "scope": item.acl_rule.scope,
                                    "permission": item.acl_rule.permission,
                                    "identity": item.acl_rule.identity,
                                    "propagate": item.acl_rule.propagate,
                                }

                        elif isinstance(item, ExplainRequirement):
                            n_item["type"] = "requirement"
                            if i_res is None or i_res.has_permission(PERM_READ, request.user):
                                n_item["requirement"] = {
                                    "scope": item.requirement.src.scope.identity,
                                    "permission": item.requirement.src.name,
                                    "attr": item.requirement.attr,
                                    "attr_empty": item.requirement.attr_empty,
                                }
                                n_item["satisfied"] = item.satisfied
                                n_item["explain"] = _explain_jsonify(item.resolver)

                        elif isinstance(item, ExplainDefault):
                            n_item["type"] = "default"

                        else:
                            raise ValueError("Unknown explain item: {}".format(item))
        return result

    return _explain_jsonify(resolver)


def search(
    request,
    *,
    serialization: Literal["resource", "full"] = "resource",
) -> AsJSON[List[CompositeRead]]:
    principal_id = request.GET.pop("owner_user__id", None)

    query = DBSession.query(Resource)
    if "parent_id__recursive" in request.GET:
        parent_id_recursive = int(request.GET.pop("parent_id__recursive"))
        if parent_id_recursive != 0:
            rquery = (
                DBSession.query(Resource.id)
                .filter(Resource.id == int(parent_id_recursive))
                .cte(recursive=True)
            )
            rquery = rquery.union_all(
                DBSession.query(Resource.id).filter(Resource.parent_id == rquery.c.id)
            )
            query = query.filter(exists().where(Resource.id == rquery.c.id))

    filter_ = []
    for k, v in request.GET.items():
        split = k.rsplit("__", 1)
        if len(split) == 2:
            k, op = split
        else:
            op = "eq"

        if not hasattr(Resource, k):
            continue
        attr = getattr(Resource, k)
        if op == "eq":
            filter_.append(attr == v)
        elif op == "ilike":
            filter_.append(ilike_op(attr, v))
        else:
            raise ValidationError("Operator '%s' is not supported" % op)
    if len(filter_) > 0:
        query = query.filter(db.and_(*filter_))

    query = query.order_by(Resource.display_name)

    if principal_id is not None:
        owner = User.filter_by(principal_id=int(principal_id)).one()
        query = query.filter_by(owner_user=owner)

    cs_keys = None if serialization == "full" else ("resource",)
    serializer = CompositeSerializer(keys=cs_keys, user=request.user)
    check_perm = lambda res, u=request.user: res.has_permission(PERM_READ, u)
    return [serializer.serialize(res, CompositeRead) for res in query if check_perm(res)]


class ResourceVolume(Struct, kw_only=True):
    volume: Annotated[int, Meta(ge=0, description="Resource volume in bytes")]


def resource_volume(
    resource,
    request,
    *,
    recursive: Annotated[bool, Meta(description="Include children resources")] = True,
) -> ResourceVolume:
    """Get resource data volume"""
    require_storage_enabled()

    def _traverse(res):
        request.resource_permission(ResourceScope.read, res)
        yield res.id
        if recursive:
            for child in res.children:
                yield from _traverse(child)

    try:
        ids = list(_traverse(resource))
    except InsufficientPermissions:
        volume = 0
    else:
        res = request.env.core.query_storage(dict(resource_id=lambda col: col.in_(ids)))
        volume = res.get("", dict()).get("data_volume", 0)
        volume = volume if volume is not None else 0

    return ResourceVolume(volume=volume)


QuotaCheckBody = Annotated[
    Dict[
        Annotated[str, Meta(examples=["webmap"])],
        Annotated[int, Meta(ge=0, examples=[1])],
    ],
    TSExport("QuotaCheckBody"),
]


class QuotaCheckSuccess(Struct, kw_only=True):
    success: Annotated[bool, Meta(examples=[True])]


class QuotaCheckFailure(Struct, kw_only=True):
    cls: Union[str, None]
    required: int
    available: int
    message: str


def quota_check(
    request,
    body: AsJSON[QuotaCheckBody],
) -> AnyOf[
    Annotated[QuotaCheckSuccess, StatusCode.OK],
    Annotated[QuotaCheckFailure, StatusCode(cast(int, QuotaExceeded.http_status_code))],
]:
    """Check for resource quota"""
    try:
        request.env.resource.quota_check(body)
    except QuotaExceeded as exc:
        request.response.status_code = exc.http_status_code
        return QuotaCheckFailure(**exc.data, message=request.translate(exc.message))
    return QuotaCheckSuccess(success=True)


# Component settings

ResourceExport = Annotated[
    Literal["data_read", "data_write", "administrators"],
    TSExport("ResourceExport"),
]
csetting("resource_export", ResourceExport, default="data_read")


def setup_pyramid(comp, config):
    config.add_route(
        "resource.blueprint",
        "/api/component/resource/blueprint",
        get=blueprint,
    )

    config.add_route(
        "resource.item",
        "/api/resource/{id}",
        factory=resource_factory,
        get=item_get,
        put=item_put,
        delete=item_delete,
    )

    config.add_route(
        "resource.collection",
        "/api/resource/",
        get=collection_get,
        post=collection_post,
    )

    config.add_route(
        "resource.permission",
        "/api/resource/{id}/permission",
        factory=resource_factory,
        get=permission,
    )

    config.add_route(
        "resource.permission.explain",
        "/api/resource/{id}/permission/explain",
        factory=resource_factory,
        get=permission_explain,
    )

    config.add_route(
        "resource.volume",
        "/api/resource/{id}/volume",
        factory=resource_factory,
        get=resource_volume,
    )

    config.add_route(
        "resource.search",
        "/api/resource/search/",
        get=search,
    )

    config.add_route(
        "resource.quota_check",
        "/api/component/resource/check_quota",
        post=quota_check,
    )

    # Overloaded routes

    config.add_route(
        "resource.export",
        "/api/resource/{id}/export",
        factory=resource_factory,
        overloaded=True,
    )

    config.add_route(
        "resource.file_download",
        "/api/resource/{id}/file/{name:any}",
        factory=resource_factory,
        overloaded=True,
    )
