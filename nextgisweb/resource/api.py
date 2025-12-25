from collections.abc import Mapping
from typing import TYPE_CHECKING, Annotated, Any, ClassVar, Literal, cast

import sqlalchemy as sa
import sqlalchemy.orm as orm
import zope.event
import zope.event.classhandler
from msgspec import UNSET, DecodeError, Meta, Struct, UnsetType, defstruct, field, to_builtins
from msgspec import ValidationError as MsgspecValidationError
from msgspec.json import Decoder
from pyramid.httpexceptions import HTTPBadRequest
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import with_polymorphic
from sqlalchemy.sql import exists
from sqlalchemy.sql import or_ as sa_or
from sqlalchemy.sql.operators import eq as eq_op
from sqlalchemy.sql.operators import ilike_op, in_op, like_op

from nextgisweb.env import DBSession, gettext
from nextgisweb.lib.apitype import AnyOf, EmptyObject, Query, StatusCode, annotate
from nextgisweb.lib.msext import DEPRECATED

from nextgisweb.auth import User
from nextgisweb.auth.api import UserID
from nextgisweb.core.exception import InsufficientPermissions, UserException, ValidationError
from nextgisweb.jsrealm import TSExport
from nextgisweb.pyramid import AsJSON, JSONType
from nextgisweb.pyramid.api import csetting, require_storage_enabled

from .category import ResourceCategory, ResourceCategoryIdentity
from .composite import CompositeSerializer
from .event import AfterResourceCollectionPost, AfterResourcePut, OnDeletePrompt
from .exception import (
    HierarchyError,
    QuotaExceeded,
    ResourceNotFound,
    ResourceRootDeleteError,
)
from .model import Resource, ResourceCls, ResourceInterfaceIdentity, ResourceScopeIdentity
from .presolver import ExplainACLRule, ExplainDefault, ExplainRequirement, PermissionResolver
from .sattribute import ResourceRefOptional, ResourceRefWithParent
from .scope import ResourceScope, Scope
from .view import ResourceID, resource_factory
from .widget import CompositeWidget


class BlueprintResource(Struct):
    identity: ResourceCls
    label: str
    base_classes: list[ResourceCls]
    interfaces: list[ResourceInterfaceIdentity]
    scopes: list[ResourceScopeIdentity]
    category: ResourceCategoryIdentity
    order: int


class BlueprintPermission(Struct):
    identity: str
    label: str


class BlueprintScope(Struct):
    identity: ResourceScopeIdentity
    label: str
    permissions: dict[str, BlueprintPermission]


class BlueprintCategory(Struct):
    identity: ResourceCategoryIdentity
    label: str
    order: int


class Blueprint(Struct):
    resources: dict[ResourceCls, BlueprintResource]
    scopes: dict[ResourceScopeIdentity, BlueprintScope]
    categories: dict[ResourceCategoryIdentity, BlueprintCategory]


def blueprint(request) -> Blueprint:
    """Read schema for resources, scopes, and categories"""
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
                category=cls.cls_category.identity,
                order=cls.cls_order,
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
        categories={
            identity: BlueprintCategory(
                identity=identity,
                label=tr(category.label),
                order=category.order,
            )
            for identity, category in ResourceCategory.registry.items()
        },
    )


if TYPE_CHECKING:
    CompositeCreate = Struct
    CompositeRead = Struct
    CompositeUpdate = Struct
else:
    composite = CompositeSerializer.types()
    CompositeCreate = composite.create
    CompositeRead = composite.read
    CompositeUpdate = composite.update


def item_get(context, request) -> CompositeRead:
    """Read resource"""
    request.resource_permission(ResourceScope.read)

    serializer = CompositeSerializer(user=request.user)
    return serializer.serialize(context, CompositeRead)


def item_put(context, request, body: CompositeUpdate) -> EmptyObject:
    """Update resource"""
    request.resource_permission(ResourceScope.read)

    serializer = CompositeSerializer(user=request.user)
    with DBSession.no_autoflush:
        serializer.deserialize(context, body)

    zope.event.notify(AfterResourcePut(context, request))


def item_delete(context, request) -> EmptyObject:
    """Delete resource"""

    def delete(obj):
        request.resource_permission(ResourceScope.delete, obj)
        request.resource_permission(ResourceScope.manage_children, obj)

        for chld in obj.children:
            delete(chld)

        DBSession.delete(obj)

    if context.id == 0:
        raise ResourceRootDeleteError

    if not OnDeletePrompt.apply(context):
        raise HierarchyError

    with DBSession.no_autoflush:
        delete(context)

    DBSession.flush()


def collection_get(
    request,
    *,
    parent: int | None = None,
) -> AsJSON[list[CompositeRead]]:
    """Read children resources"""
    query = (
        Resource.query()
        .filter_by(parent_id=parent)
        .order_by(Resource.display_name)
        .options(orm.subqueryload(Resource.acl))
    )

    serializer = CompositeSerializer(user=request.user)
    result = list()
    for resource in query:
        if resource.has_permission(ResourceScope.read, request.user):
            result.append(serializer.serialize(resource, CompositeRead))

    serializer = CompositeSerializer(user=request.user)
    check_perm = lambda res, u=request.user: res.has_permission(ResourceScope.read, u)
    resources = [res for res in query if check_perm(res)]
    resources.sort(key=lambda res: (res.cls_order, res.display_name))
    return [serializer.serialize(res, CompositeRead) for res in resources]


def collection_post(
    request, body: CompositeCreate
) -> Annotated[ResourceRefWithParent, StatusCode(201)]:
    """Create resource"""

    request.env.core.check_storage_limit()

    resource_cls = body.resource.cls
    resource = Resource.registry[resource_cls](owner_user=request.user)
    serializer = CompositeSerializer(user=request.user)

    resource.persist()
    with DBSession.no_autoflush:
        try:
            serializer.deserialize(resource, body)
        except MsgspecValidationError as exc:
            raise ValidationError(message=exc.args[0]) from exc

    DBSession.flush()

    request.audit_context("resource", resource.id)
    zope.event.notify(AfterResourceCollectionPost(resource, request))

    request.response.status_code = 201
    parent_ref = ResourceRefOptional(id=resource.parent.id)
    return ResourceRefWithParent(id=resource.id, parent=parent_ref)


DeleteResources = Annotated[list[ResourceID], Meta(description="Resource IDs to delete")]


class ResourceDeleteSummary(Struct, kw_only=True):
    count: Annotated[int, Meta(description="Total number of resources")]
    resources: Annotated[dict[ResourceCls, int], Meta(description="Number of resources by class")]

    @classmethod
    def from_resources(cls, resources):
        return cls(
            count=sum(resources.values()),
            resources=resources,
        )


class ResourceDeleteGetResponse(Struct, kw_only=True):
    affected: Annotated[
        ResourceDeleteSummary,
        Meta(description="Summary on deletable resources"),
    ]
    unaffected: Annotated[
        ResourceDeleteSummary,
        Meta(description="Summary on non-deletable resources"),
    ]


def _delete_multiple(request, resource_ids, partial, *, dry_run):
    affected = dict()
    unaffected = dict()

    def _acc(d, cls, v=1):
        if cls not in d:
            d[cls] = v
        else:
            d[cls] += v

    def delete(resource):
        if resource.id == 0:
            raise ResourceRootDeleteError

        _affected = dict()

        def _delete(resource):
            request.resource_permission(ResourceScope.delete, resource)
            request.resource_permission(ResourceScope.manage_children, resource)

            for child in resource.children:
                _delete(child)

            if not dry_run:
                DBSession.delete(resource)
            _acc(_affected, resource.cls)

        _delete(resource)
        return _affected

    for rid in resource_ids:
        cls = "resource"

        try:
            resource = Resource.filter_by(id=rid).one()
        except NoResultFound:
            if not partial:
                raise ResourceNotFound(rid)
        else:
            try:
                resource_affected = delete(resource)
            except UserException:
                if not partial:
                    raise
                if resource.has_permission(ResourceScope.read, request.user):
                    cls = resource.cls
            else:
                for k, v in resource_affected.items():
                    _acc(affected, k, v)
                continue

        _acc(unaffected, cls)

    return ResourceDeleteGetResponse(
        affected=ResourceDeleteSummary.from_resources(resources=affected),
        unaffected=ResourceDeleteSummary.from_resources(resources=unaffected),
    )


def delete_get(request, *, resources: DeleteResources) -> ResourceDeleteGetResponse:
    """Simulate deletion of multiple resources"""
    return _delete_multiple(request, resources, True, dry_run=True)


def delete_post(
    request,
    *,
    resources: DeleteResources,
    partial: Annotated[
        bool,
        Meta(description="Skip non-deletable resources"),
    ] = False,
) -> EmptyObject:
    """Delete multiple resources"""

    with DBSession.no_autoflush:
        _delete_multiple(request, resources, partial, dry_run=False)


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
            ((sid, struct) if sid == "resource" else (sid, struct | UnsetType, UNSET))
            for sid, struct in scope_permissions_struct.items()
        ],
    )


def permission(
    resource,
    request,
    *,
    user: UserID | None = None,
) -> EffectivePermissions:
    """Get resource effective permissions"""
    request.resource_permission(ResourceScope.read)

    user_obj = User.filter_by(id=user).one() if (user is not None) else request.user
    if user_obj.id != request.user.id:
        request.resource_permission(ResourceScope.change_permissions)

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
    """Explain effective resource permissions"""
    request.resource_permission(ResourceScope.read)

    req_scope = request.params.get("scope")
    req_permission = request.params.get("permission")

    req_user_id = request.params.get("user")
    user = User.filter_by(id=req_user_id).one() if req_user_id is not None else request.user
    other_user = user != request.user
    if other_user:
        request.resource_permission(ResourceScope.change_permissions)

    resource = request.context

    if req_scope is not None or req_permission is not None:
        permissions = list()
        for perm in resource.class_permissions():
            if req_scope is None or perm.scope.identity == req_scope:
                if req_permission is None or perm.name == req_permission:
                    permissions.append(perm)
        if len(permissions) == 0:
            raise ValidationError(gettext("Permission not found"))
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
                            if i_res.has_permission(ResourceScope.read, request.user):
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
                            if i_res is None or i_res.has_permission(
                                ResourceScope.read, request.user
                            ):
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


class SearchRootParams(Struct, kw_only=True):
    root: Annotated[
        ResourceID | UnsetType,
        Meta(description="Starting resource ID for recursive search"),
    ] = UNSET

    parent_id__recursive: Annotated[
        ResourceID | UnsetType,
        Meta(description="Use `root` instead"),
        DEPRECATED,
    ] = UNSET

    def query(self):
        if (root := self.root) is UNSET:
            root = self.parent_id__recursive

        result = sa.select(Resource)
        if root is not UNSET:
            child = (
                sa.select(Resource.id, sa.literal_column("0").label("depth"))
                .where(Resource.id == root)
                .cte("child", recursive=True)
            )

            child = child.union_all(
                sa.select(Resource.id, sa.literal_column("depth + 1")).where(
                    Resource.parent_id == child.c.id
                )
            )

            result = result.join(child, Resource.id == child.c.id)

        return result


class SearchAttrParams(Struct, kw_only=True):
    id: Annotated[
        ResourceID | UnsetType,
        Meta(description="Filter by exact ID"),
    ] = UNSET

    id__eq: Annotated[
        ResourceID | UnsetType,
        Meta(description="Use `id` instead"),
        DEPRECATED,
    ] = UNSET

    id__in: Annotated[
        list[ResourceID] | UnsetType,
        Meta(description="Filter by list of IDs"),
    ] = UNSET

    cls: Annotated[
        str | UnsetType,
        Meta(description="Filter by exact type"),
    ] = UNSET

    cls__eq: Annotated[
        str | UnsetType,
        Meta(description="Use `cls` instead"),
        DEPRECATED,
    ] = UNSET

    cls__like: Annotated[
        str | UnsetType,
        Meta(description="Filter by type pattern with case sensitivity"),
        DEPRECATED,
    ] = UNSET

    cls__ilike: Annotated[
        str | UnsetType,
        Meta(description="Filter by type pattern without case sensitivity"),
        DEPRECATED,
    ] = UNSET

    cls__in: Annotated[
        list[str] | UnsetType,
        Meta(description="Filter by list of types"),
    ] = UNSET

    parent: Annotated[
        ResourceID | UnsetType,
        Meta(description="Filter by exact parent ID"),
    ] = UNSET

    parent__in: Annotated[
        list[ResourceID] | UnsetType,
        Meta(description="Filter by list of parent IDs"),
    ] = UNSET

    parent_id: Annotated[
        ResourceID | UnsetType,
        Meta(description="Use `parent` instead"),
        DEPRECATED,
    ] = UNSET

    parent_id__eq: Annotated[
        ResourceID | UnsetType,
        Meta(description="Use `parent` instead"),
        DEPRECATED,
    ] = UNSET

    parent_id__in: Annotated[
        list[ResourceID] | UnsetType,
        Meta(description="Use `parent__in` instead"),
        DEPRECATED,
    ] = UNSET

    keyname: Annotated[
        str | UnsetType,
        Meta(description="Filter by exact keyname"),
    ] = UNSET

    keyname__eq: Annotated[
        str | UnsetType,
        Meta(description="Use `keyname` instead"),
        DEPRECATED,
    ] = UNSET

    keyname__in: Annotated[
        list[str] | UnsetType,
        Meta(description="Filter by list of keynames"),
    ] = UNSET

    display_name: Annotated[
        str | UnsetType,
        Meta(description="Filter by exact display name"),
    ] = UNSET

    display_name__eq: Annotated[
        str | UnsetType,
        Meta(description="Use `display_name` instead"),
        DEPRECATED,
    ] = UNSET

    display_name__like: Annotated[
        str | UnsetType,
        Meta(description="Filter by display name pattern with case sensitivity"),
    ] = UNSET

    display_name__ilike: Annotated[
        str | UnsetType,
        Meta(description="Filter by display name pattern without case sensitivity"),
    ] = UNSET

    display_name__in: Annotated[
        list[str] | UnsetType,
        Meta(description="Filter by list of display names"),
    ] = UNSET

    owner_user: Annotated[
        UserID | UnsetType,
        Meta(description="Filter by owner user ID"),
    ] = UNSET

    owner_user__in: Annotated[
        list[UserID] | UnsetType,
        Meta(description="Filter by list of owner user IDs"),
    ] = UNSET

    owner_user_id: Annotated[
        UserID | UnsetType,
        Meta(description="Use `owner_user` instead"),
        DEPRECATED,
    ] = UNSET

    owner_user_id__eq: Annotated[
        UserID | UnsetType,
        Meta(description="Use `owner_user` instead"),
        DEPRECATED,
    ] = UNSET

    owner_user_id__in: Annotated[
        list[UserID] | UnsetType,
        Meta(description="Use `owner_user__in` instead"),
        DEPRECATED,
    ] = UNSET

    ats: ClassVar[dict[str, Any]] = {
        "id": Resource.id,
        "cls": Resource.cls,
        "parent": Resource.parent_id,
        "keyname": Resource.keyname,
        "display_name": Resource.display_name,
        "owner_user": Resource.owner_user_id,
        # DEPRECATED
        "parent_id": Resource.parent_id,
        "owner_user_id": Resource.owner_user_id,
    }

    ops: ClassVar[dict[str, Any]] = {
        "": eq_op,
        "eq": eq_op,
        "like": like_op,
        "ilike": ilike_op,
        "in": lambda a, b: in_op(a, tuple(b)),
    }

    def filters(self):
        ats = self.ats
        ops = self.ops
        for k, v in to_builtins(self).items():
            s = k.split("__", maxsplit=1)
            if len(s) == 1:
                s = (*s, "")
            yield ops[s[1]](ats[s[0]], v)


class SearchResmetaParams(Struct, kw_only=True):
    has: Annotated[
        dict[str, bool],
        Meta(
            description="Filter by the presence of metadata keys\n\n"
            "If `true`, only resources that include the specified metadata key "
            "will be returned. If `false`, only resources that do not contain "
            "the key will be returned.",
            examples=[dict()],  # Just to stop Swagger UI make crazy defaults
        ),
    ] = field(name="resmeta__has")

    json: Annotated[
        dict[str, str],
        Meta(
            description="Filter by metadata values\n\n"
            'Values should be JSON-encoded, e.g., `"foo"` for a string '
            "match, `42` for a number match, and `true` for a boolean match.",
            examples=[dict()],  # Just to stop Swagger UI make crazy defaults
        ),
    ] = field(name="resmeta__json")

    like: Annotated[
        dict[str, str],
        Meta(
            description="Filter by metadata value pattern with case sensitivity",
            examples=[dict()],  # Just to stop Swagger UI make crazy defaults
        ),
    ] = field(name="resmeta__like")

    ilike: Annotated[
        dict[str, str],
        Meta(
            description="Filter by metadata value pattern without case sensitivity",
            examples=[dict()],  # Just to stop Swagger UI make crazy defaults
        ),
    ] = field(name="resmeta__ilike")

    vdecoder: ClassVar = Decoder(str | int | float | bool)

    def filters(self, id):
        from nextgisweb.resmeta.model import ResourceMetadataItem as RMI

        def _cond(k, *where):
            return exists().where(id == RMI.resource_id, RMI.key == k, *where)

        for k, v in self.has.items():
            cond = _cond(k)
            yield cond if v else ~cond

        for k, v in self.json.items():
            try:
                d = self.vdecoder.decode(v)
            except (DecodeError, MsgspecValidationError) as exc:
                raise ValidationError(message=exc.args[0])
            if isinstance(d, (int, float)):
                vfilter = sa_or(RMI.vinteger == d, RMI.vfloat == d)
            elif isinstance(d, bool):
                vfilter = RMI.vboolean == d
            elif isinstance(d, str):
                vfilter = RMI.vtext == d
            else:
                raise NotImplementedError
            yield _cond(k, vfilter)

        for o, c in (
            ("like", like_op),
            ("ilike", ilike_op),
        ):
            d = getattr(self, o)
            for k, v in d.items():
                yield _cond(k, c(RMI.vtext, v))


def search(
    request,
    *,
    serialization: Annotated[
        Literal["resource", "full"],
        Meta(
            description="Resource serialization mode\n\n"
            "If set to `full`, all resource keys are returned, but this is "
            "significantly slower. Otherwise, only the `resource` key is serialized."
        ),
    ] = "resource",
    root: Annotated[SearchRootParams, Query(spread=True)],
    attrs: Annotated[SearchAttrParams, Query(spread=True)],
    resmeta: Annotated[SearchResmetaParams, Query(spread=True)],
) -> AsJSON[list[CompositeRead]]:
    """Search resources"""

    query = root.query()
    query = query.where(*attrs.filters(), *resmeta.filters(Resource.id))
    query = query.order_by(Resource.display_name)

    cs_keys = None if serialization == "full" else ("resource",)
    serializer = CompositeSerializer(keys=cs_keys, user=request.user)
    check_perm = lambda res, u=request.user: res.has_permission(ResourceScope.read, u)
    return [
        serializer.serialize(res, CompositeRead)
        for (res,) in DBSession.execute(query)
        if check_perm(res)
    ]


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
    dict[
        Annotated[ResourceCls, Meta(examples=["webmap"])],
        Annotated[int, Meta(ge=0, examples=[1])],
    ],
    TSExport("QuotaCheckBody"),
]


class QuotaCheckSuccess(Struct, kw_only=True):
    success: Annotated[bool, Meta(examples=[True])]


class QuotaCheckFailure(Struct, kw_only=True):
    cls: str | None
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


CompositeWidgetOperation = Annotated[
    Literal["create", "update"],
    TSExport("CompositeWidgetOperation"),
]

CompositeMembersConfig = Annotated[
    dict[str, Any],
    TSExport("CompositeMembersConfig"),
]


class CompositeOperationCreate(Struct, kw_only=True, tag="create", tag_field="operation"):
    cls: ResourceCls
    parent: ResourceID
    owner_user: UserID
    members: CompositeMembersConfig
    suggested_display_name: Annotated[str | None, Meta(description="Suggested display name")]


class CompositeOperationUpdate(Struct, kw_only=True, tag="update", tag_field="operation"):
    id: ResourceID
    cls: ResourceCls
    parent: ResourceID | None
    owner_user: UserID
    members: CompositeMembersConfig


def widget(
    request,
    *,
    operation: CompositeWidgetOperation,
    id: ResourceID | None = None,
    cls: ResourceCls | None = None,
    parent: ResourceID | None = None,
) -> AsJSON[CompositeOperationCreate | CompositeOperationUpdate]:
    if operation == "create":
        if id is not None or cls is None or parent is None:
            raise HTTPBadRequest()

        if cls not in Resource.registry._dict:
            raise HTTPBadRequest()

        parent_obj = with_polymorphic(Resource, "*").filter_by(id=parent).one()

        tr = request.localizer.translate
        obj = Resource.registry[cls](parent=parent_obj, owner_user=request.user)
        composite = CompositeWidget(operation=operation, obj=obj, request=request)
        suggested_dn = obj.suggest_display_name(tr)
        return CompositeOperationCreate(
            cls=cls,
            parent=parent_obj.id,
            owner_user=request.user.id,
            members=composite.config(),
            suggested_display_name=suggested_dn,
        )

    elif operation == "update":
        if id is None or cls is not None or parent is not None:
            raise HTTPBadRequest()

        obj = with_polymorphic(Resource, "*").filter_by(id=id).one()
        composite = CompositeWidget(operation=operation, obj=obj, request=request)
        return CompositeOperationUpdate(
            id=obj.id,
            cls=obj.cls,
            parent=obj.parent_id,
            owner_user=request.user.id,
            members=composite.config(),
        )
    else:
        raise NotImplementedError


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
        "resource.items.delete",
        "/api/resource/delete",
        get=delete_get,
        post=delete_post,
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

    from .favorite import api as favorite_api

    favorite_api.setup_pyramid(comp, config)

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

    config.add_route("resource.widget", "/api/resource/widget", get=widget)
