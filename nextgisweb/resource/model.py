from collections import namedtuple
from datetime import datetime
from types import MappingProxyType
from typing import ClassVar, List, Literal, Tuple, Type, Union

from msgspec import Struct
from sqlalchemy import event, func, text
from typing_extensions import Annotated

from nextgisweb.env import Base, DBSession, env, gettext
from nextgisweb.lib import db
from nextgisweb.lib.i18n import TrStr
from nextgisweb.lib.registry import DictRegistry
from nextgisweb.lib.safehtml import sanitize

from nextgisweb.auth import Group, OnFindReferencesData, Principal, User
from nextgisweb.core.exception import ForbiddenError, ValidationError
from nextgisweb.jsrealm import TSExport

from .exception import DisplayNameNotUnique, HierarchyError
from .interface import IResourceAdapter, interface_registry
from .permission import RequirementList
from .sattribute import ResourceRef, SColumn, SRelationship, SResource
from .scope import DataScope, MetadataScope, ResourceScope, Scope
from .serialize import CRUTypes, SAttribute, Serializer

Base.depends_on("auth")

resource_registry = DictRegistry()

PermissionSets = namedtuple("PermissionSets", ("allow", "deny", "mask"))


class ResourceMeta(db.DeclarativeMeta):
    def __new__(cls, name, bases, nspc):
        identity = nspc["identity"]

        if bases == (Base,):
            # Resource class itself
            bres = None
        else:
            # First base class, which is subclass of Resource
            bres = next((c for c in bases if issubclass(c, Resource)), None)
            assert bres is not None, "Missing resource base class"

        nspc.setdefault("__tablename__", identity)

        if (id_column := nspc.get("id")) is None:
            id_column = nspc["id"] = bres.id_column()

        margs = nspc["__mapper_args__"] = nspc.get("__mapper_args__", {})
        margs.setdefault("polymorphic_identity", identity)
        if "inherit_condition" not in margs and bres:
            margs["inherit_condition"] = id_column == bres.id

        return super().__new__(cls, name, bases, nspc)

    def __init__(cls, name, bases, nspc):
        scope = dict()

        for base in cls.__mro__:
            bscope = base.__dict__.get("__scope__", None)
            if bscope is None:
                continue
            if not hasattr(bscope, "__iter__"):
                bscope = tuple((bscope,))

            for s in bscope:
                scope[s.identity] = s

        setattr(cls, "scope", MappingProxyType(scope))
        super().__init__(name, bases, nspc)

        resource_registry.register(cls)


ResourceScopeType = Union[Tuple[Type[Scope], ...], Type[Scope]]


class Resource(Base, metaclass=ResourceMeta):
    registry = resource_registry

    identity: ClassVar[str] = "resource"
    cls_display_name: ClassVar[TrStr] = gettext("Resource")
    __scope__: ClassVar[ResourceScopeType] = (ResourceScope, MetadataScope)

    id = db.Column(db.Integer, primary_key=True)
    cls = db.Column(db.Unicode, nullable=False)

    parent_id = db.Column(db.ForeignKey(id))

    keyname = db.Column(db.Unicode, unique=True)
    display_name = db.Column(db.Unicode, nullable=False)
    creation_date = db.Column(db.TIMESTAMP, nullable=False, default=datetime.utcnow)

    owner_user_id = db.Column(db.ForeignKey(User.id), nullable=False)

    description = db.Column(db.Unicode)

    __mapper_args__ = dict(polymorphic_on=cls)
    __table_args__ = (
        db.CheckConstraint("parent_id IS NOT NULL OR id = 0"),
        db.UniqueConstraint(parent_id, display_name),
    )

    parent = db.relationship(
        "Resource",
        remote_side=[id],
        backref=db.backref("children", cascade=None, order_by=display_name),
    )

    owner_user = db.relationship(User)

    def __str__(self):
        return self.display_name

    @classmethod
    def id_column(cls):
        """Constructs new 'id' column with a foreign key to cls.id"""

        col = db.Column("id", db.ForeignKey(cls.id), primary_key=True)
        col._creation_order = cls.id._creation_order
        return col

    @classmethod
    def check_parent(cls, parent) -> bool:
        """Can this resource be child for parent?"""
        return False

    @classmethod
    def implemented_interfaces(cls):
        """List resource interfaces implemented by class"""
        return [
            i
            for i in interface_registry
            if (i.implementedBy(cls) or IResourceAdapter((i, cls), None))
        ]

    def lookup_interface(self, iface):
        """Get resource interface implementation"""
        if iface.providedBy(self):
            return self

        if adapter := IResourceAdapter((iface, self.__class__), None):
            result = adapter(self)
            assert iface.providedBy(result)
            return result

        return None

    def provided_interfaces(self):
        """List resource interfaces provided by instance"""
        return [i for i in interface_registry if self.lookup_interface(i)]

    @property
    def parents(self):
        """List of all parents from root to current parent"""
        result = []
        current = self
        while current.parent:
            current = current.parent
            result.append(current)

        return reversed(result)

    # Permissions

    @classmethod
    def class_permissions(cls):
        """Permissions applicable to this resource class"""

        result = set()
        for scope in cls.scope.values():
            result.update(scope.values())

        return frozenset(result)

    @classmethod
    def class_requirements(cls):
        result = RequirementList()
        for scope in cls.scope.values():
            for req in scope.requirements:
                if req.cls is None or issubclass(cls, req.cls):
                    result.append(req)
        result.toposort()
        return tuple(result)

    def permission_sets(self, user):
        class_permissions = self.class_permissions()

        if user.superuser:
            return PermissionSets(allow=set(class_permissions), deny=set(), mask=set())

        allow = set()
        deny = set()
        mask = set()

        for res in tuple(self.parents) + (self,):
            rules = filter(
                lambda rule: (
                    (rule.propagate or res == self)
                    and rule.cmp_identity(self.identity)
                    and rule.cmp_user(user)
                ),
                res.acl,
            )

            for rule in rules:
                for perm in class_permissions:
                    if rule.cmp_permission(perm):
                        if rule.action == "allow":
                            allow.add(perm)
                        elif rule.action == "deny":
                            deny.add(perm)

        for req in self.class_requirements():
            if req.attr is None:
                has_req = req.src in allow and req.src not in deny and req.src not in mask
            else:
                attrval = getattr(self, req.attr)

                if attrval is None:
                    has_req = req.attr_empty is True
                else:
                    has_req = attrval.has_permission(req.src, user)

            if not has_req:
                mask.add(req.dst)

        return PermissionSets(allow=allow, deny=deny, mask=mask)

    def permissions(self, user):
        sets = self.permission_sets(user)
        return sets.allow - sets.mask - sets.deny

    def has_permission(self, permission, user):
        return permission in self.permissions(user)

    def has_export_permission(self, user):
        try:
            value = env.core.settings_get("resource", "resource_export")
        except KeyError:
            value = "data_read"

        if value == "administrators":
            return user.is_administrator

        if value == "data_write":
            permission = DataScope.write
        else:
            permission = DataScope.read

        return self.has_permission(permission, user)

    # Data validation

    @db.validates("parent")
    def _validate_parent(self, key, value):
        """Test for closed loops in hierarchy"""

        with DBSession.no_autoflush:
            if value is not None:
                if self == value or self in value.parents:
                    raise HierarchyError(gettext("Resource can not be a parent himself."))

        return value

    @db.validates("keyname")
    def _validate_keyname(self, key, value):
        """Test for key uniqueness"""

        with DBSession.no_autoflush:
            if (
                value is not None
                and Resource.filter(Resource.keyname == value, Resource.id != self.id).first()
            ):
                raise ValidationError(gettext("Resource keyname is not unique."))

        return value

    @db.validates("owner_user")
    def _validate_owner_user(self, key, value):
        with DBSession.no_autoflush:
            if value.system and value.keyname != "guest":
                raise ValidationError("System user cannot be a resource owner.")

        return value

    # Preview

    @classmethod
    def check_social_editable(cls):
        """Can this resource social settings be editable?"""
        return False

    # Suggest display name

    def suggest_display_name(self, tr):
        def _query(*args):
            q = DBSession.query(*args)
            if self.parent and self.parent.id is not None:
                q = q.filter(Resource.parent_id == self.parent.id)
            return q

        def _candidates():
            if self.identity.endswith("_style"):
                q = _query(func.count(Resource.id))
                if q.scalar() == 0:
                    yield tr(gettext("Default style"))

            yield tr(self.cls_display_name)

            q = _query(func.count(Resource.id)).filter(Resource.cls == self.cls)
            yield tr(self.cls_display_name) + " " + str(q.scalar() + 1)

        for c in _candidates():
            q = _query(Resource.id).filter(Resource.display_name == c)
            if not q.scalar():
                return c


@event.listens_for(Resource, "after_delete", propagate=True)
def resource_after_delete(mapper, connection, target):
    # fmt: off
    connection.execute(text("""
        INSERT INTO core_storage_stat_delta (
            tstamp, component, kind_of_data,
            resource_id, value_data_volume
        )
        SELECT
            :timestamp, component, kind_of_data,
            :resource_id, -SUM(value_data_volume)
        FROM (
            SELECT component, kind_of_data, resource_id, value_data_volume
            FROM core_storage_stat_dimension
            UNION ALL
            SELECT component, kind_of_data, resource_id, value_data_volume
            FROM core_storage_stat_delta
        ) t
        WHERE resource_id = :resource_id
        GROUP BY component, kind_of_data
    """), dict(timestamp=datetime.utcnow(), resource_id=target.id))
    # fmt: on


ResourceScope.read.require(
    ResourceScope.read,
    attr="parent",
    attr_empty=True,
)


class ResourceACLRule(Base):
    __tablename__ = "resource_acl_rule"

    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    principal_id = db.Column(db.ForeignKey(Principal.id), primary_key=True)

    identity = db.Column(db.Unicode, primary_key=True, default="")
    scope = db.Column(db.Unicode, primary_key=True, default="")
    permission = db.Column(db.Unicode, primary_key=True, default="")
    propagate = db.Column(db.Boolean, primary_key=True, default=True)
    action = db.Column(db.Unicode, nullable=False, default=True)

    resource = db.relationship(Resource, backref=db.backref("acl", cascade="all, delete-orphan"))
    principal = db.relationship(Principal)

    def cmp_user(self, user):
        principal = self.principal
        return (isinstance(principal, User) and principal.compare(user)) or (
            isinstance(principal, Group) and principal.is_member(user)
        )

    def cmp_identity(self, identity):
        return (self.identity == "") or (self.identity == identity)

    def cmp_permission(self, permission):
        pname = permission.name
        pscope = permission.scope.identity

        return (
            (self.scope == "" and self.permission == "")
            or (self.scope == pscope and self.permission == "")
            or (self.scope == pscope and self.permission == pname)
        )


ResourceCls = Annotated[str, TSExport("ResourceCls")]


class ClsAttr(SColumn, apitype=True):
    def writeperm(self, srlzr):
        return True

    def get(self, srlzr) -> ResourceCls:
        return super().get(srlzr)

    def set(self, srlzr, value: ResourceCls, *, create: bool):
        assert srlzr.obj.cls == value


class ParentAttr(SResource, apitype=True):
    def setup_types(self):
        # Only the root has an empty parent, thus it cannot be set empty
        super().setup_types()
        self.types = CRUTypes(ResourceRef, self.types.read, ResourceRef)

    def writeperm(self, srlzr):
        return True

    def set(self, srlzr: Serializer, value, *, create: bool):
        old_parent = srlzr.obj.parent
        super().set(srlzr, value, create=create)

        if old_parent == srlzr.obj.parent:
            return

        if srlzr.obj.parent is None:
            raise ForbiddenError(gettext("Resource can not be without a parent."))

        for parent in (old_parent, srlzr.obj.parent):
            if parent is not None and not parent.has_permission(
                ResourceScope.manage_children, srlzr.user
            ):
                raise ForbiddenError(
                    gettext("You are not allowed to manage children of resource with id = %d.")
                    % parent.id
                )

        if not srlzr.obj.check_parent(srlzr.obj.parent):
            raise HierarchyError(
                gettext("Resource can not be a child of resource id = %d.") % srlzr.obj.parent.id
            )


class PrincipalRef(Struct, kw_only=True):
    id: int


class OwnerUserAttr(SRelationship, apitype=True):
    def get(self, srlzr) -> PrincipalRef:
        return PrincipalRef(id=srlzr.obj.owner_user_id)

    def set(self, srlzr, value: PrincipalRef, *, create: bool):
        if not srlzr.user.is_administrator:
            raise ForbiddenError("Membership in group 'administrators' required!")
        super().set(srlzr, value, create=create)


REQUIRED_PERMISSIONS_FOR_ADMINISTATORS = [
    ResourceScope.read,
    ResourceScope.update,
    ResourceScope.change_permissions,
]


class ACLRule(Struct, kw_only=True):
    action: Annotated[Literal["allow", "deny"], TSExport("ACLRuleAction")]
    principal: PrincipalRef
    identity: str
    scope: str
    permission: str
    propagate: bool

    @classmethod
    def from_model(cls, obj: ResourceACLRule):
        return cls(
            action=obj.action,
            principal=PrincipalRef(id=obj.principal_id),
            identity=obj.identity,
            scope=obj.scope,
            permission=obj.permission,
            propagate=obj.propagate,
        )


class ACLAttr(SAttribute, apitype=True):
    def get(self, srlzr) -> List[ACLRule]:
        return [ACLRule.from_model(itm) for itm in srlzr.obj.acl]

    def set(self, srlzr, value: List[ACLRule], *, create: bool):
        for r in list(srlzr.obj.acl):
            srlzr.obj.acl.remove(r)

        for itm in value:
            rule = ResourceACLRule(
                identity=itm.identity,
                scope=itm.scope,
                permission=itm.permission,
                propagate=itm.propagate,
                action=itm.action,
            )

            rule.principal = Principal.filter_by(id=itm.principal.id).one()

            srlzr.obj.acl.append(rule)

        if srlzr.obj.id == 0:
            for user in User.filter(
                User.disabled.is_(False), User.member_of.any(keyname="administrators")
            ):
                perms = srlzr.obj.permissions(user)
                if not perms.issuperset(REQUIRED_PERMISSIONS_FOR_ADMINISTATORS):
                    for p in REQUIRED_PERMISSIONS_FOR_ADMINISTATORS:
                        if p in perms:
                            continue
                        raise ValidationError(
                            message=gettext(
                                "Unable to revoke '{s}: {p}' permission for '{u}' "
                                "as the user belongs to the administrators group. "
                                "Administrators must always have ability to "
                                "configure permissions of the main resource group."
                            ).format(s=p.scope.label, p=p.label, u=user.display_name)
                        )
                    else:
                        assert False


class DescriptionAttr(SColumn, apitype=True):
    def setter(self, srlzr, value):
        if value is not None:
            value = sanitize(value)
        super().setter(srlzr, value)


class ChildrenAttr(SAttribute, apitype=True):
    def get(self, srlzr) -> bool:
        return len(srlzr.obj.children) > 0


class InterfacesAttr(SAttribute, apitype=True):
    def get(self, srlzr) -> List[str]:
        return [i.getName() for i in srlzr.obj.provided_interfaces()]


class ScopesAttr(SAttribute, apitype=True):
    def get(self, srlzr) -> List[str]:
        return list(srlzr.obj.scope.keys())


class ResourceSerializer(Serializer, apitype=True):
    identity = Resource.identity
    resclass = Resource

    id = SColumn(read=ResourceScope.read, write=None)
    cls = ClsAttr(read=ResourceScope.read, write=None, required=False)
    creation_date = SColumn(read=ResourceScope.read, write=None)

    parent = ParentAttr(read=ResourceScope.read, write=ResourceScope.update)
    owner_user = OwnerUserAttr(read=ResourceScope.read, write=ResourceScope.update, required=False)

    permissions = ACLAttr(read=ResourceScope.read, write=ResourceScope.change_permissions)

    keyname = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    display_name = SColumn(read=ResourceScope.read, write=ResourceScope.update)

    description = DescriptionAttr(read=ResourceScope.read, write=ResourceScope.update)

    children = ChildrenAttr(read=ResourceScope.read, write=None)
    interfaces = InterfacesAttr(read=ResourceScope.read, write=None)
    scopes = ScopesAttr(read=ResourceScope.read, write=None)

    def deserialize(self, *args, **kwargs):
        # As the test for uniqueness within group is dependent on two attributes
        # (parent, display_name), it is possible to correctly check its
        # completion after serialization of both attributes.

        # Save old values to track changes
        parent, display_name = self.obj.parent, self.obj.display_name

        super().deserialize(*args, **kwargs)

        if parent != self.parent or display_name != self.display_name:
            with DBSession.no_autoflush:
                conflict = Resource.filter(
                    Resource.parent_id == self.obj.parent.id
                    if self.obj.parent is not None
                    else None,
                    Resource.display_name == self.obj.display_name,
                    Resource.id != self.obj.id,
                ).first()

            if conflict is not None:
                raise DisplayNameNotUnique(conflict.id)

        if self.obj.id is None:
            env.resource.quota_check({self.obj.cls: 1})


@Principal.on_find_references.handler
def _on_find_references(event):
    principal = event.principal
    data = event.data

    for acl in ResourceACLRule.filter_by(principal_id=principal.id).all():
        resource = acl.resource
        data.append(
            OnFindReferencesData(
                cls=resource.cls,
                id=resource.id,
                autoremove=False,
            )
        )

    if isinstance(principal, User):
        for resource in Resource.filter_by(owner_user_id=principal.id).all():
            data.append(
                OnFindReferencesData(
                    cls=resource.cls,
                    id=resource.id,
                    autoremove=False,
                )
            )


class ResourceGroup(Resource):
    identity = "resource_group"
    cls_display_name = gettext("Resource group")

    @classmethod
    def check_parent(cls, parent):
        # Group can be either root or subgroup in other group
        return (parent is None) or isinstance(parent, ResourceGroup)
