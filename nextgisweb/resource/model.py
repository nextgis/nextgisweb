import logging
from collections import namedtuple, OrderedDict
from datetime import datetime

from bunch import Bunch
from sqlalchemy import event, text

from .. import db
from ..auth import Principal, User, Group, OnFindReferencesData
from ..core.exception import ValidationError, ForbiddenError
from ..env import env
from ..models import declarative_base, DBSession
from ..registry import registry_maker

from .util import _
from .interface import providedBy
from .serialize import (
    Serializer,
    SerializedProperty as SP,
    SerializedRelationship as SR,
    SerializedResourceRelationship as SRR)
from .scope import DataScope, ResourceScope, MetadataScope
from .permission import RequirementList
from .exception import HierarchyError, DisplayNameNotUnique


__all__ = ['Resource', ]

_logger = logging.getLogger(__name__)

Base = declarative_base(dependencies=('auth', ))

resource_registry = registry_maker()

PermissionSets = namedtuple('PermissionSets', ('allow', 'deny', 'mask'))


class ResourceMeta(db.DeclarativeMeta):

    def __init__(cls, classname, bases, nmspc):

        # Table name is equal to resource id by default.
        # It'll hardlybe ever needed otherwise, but let's keep this
        # possibility.

        if '__tablename__' not in cls.__dict__:
            setattr(cls, '__tablename__', cls.identity)

        # Child class can set it's own arguments, let's
        # keep it possible. If not set, set our own.

        if '__mapper_args__' not in cls.__dict__:
            mapper_args = dict()
            setattr(cls, '__mapper_args__', mapper_args)
        else:
            mapper_args = getattr(cls, '__mapper_args__')

        if 'polymorphic_identity' not in mapper_args:
            mapper_args['polymorphic_identity'] = cls.identity

        # For Resource class this variable is not set yet.
        Resource = globals().get('Resource', None)

        if Resource and cls != Resource:

            # Field with external key is needed for child classes, pointing
            # to base resource class. May need to be created by hand, but easier to
            # create for all together.

            if 'id' not in cls.__dict__:
                idcol = db.Column('id', db.ForeignKey(Resource.id),
                                  primary_key=True)
                idcol._creation_order = Resource.id._creation_order
                setattr(cls, 'id', idcol)

            # Automatic parent link field detection may not work
            # if there are two fields with external key to resource.id.

            if 'inherit_condition' not in mapper_args:
                mapper_args['inherit_condition'] = (
                    cls.id == Resource.id)

        scope = Bunch()

        for base in cls.__mro__:
            bscope = base.__dict__.get('__scope__', None)

            if bscope is None:
                continue

            if bscope and not hasattr(bscope, '__iter__'):
                bscope = tuple((bscope, ))

            for s in bscope:
                scope[s.identity] = s

        setattr(cls, 'scope', scope)

        super().__init__(classname, bases, nmspc)

        resource_registry.register(cls)


class Resource(Base, metaclass=ResourceMeta):
    registry = resource_registry

    identity = 'resource'
    cls_display_name = _("Resource")

    __scope__ = (ResourceScope, MetadataScope)

    id = db.Column(db.Integer, primary_key=True)
    cls = db.Column(db.Unicode, nullable=False)

    parent_id = db.Column(db.ForeignKey(id))

    keyname = db.Column(db.Unicode, unique=True)
    display_name = db.Column(db.Unicode, nullable=False)
    creation_date = db.Column(db.TIMESTAMP, nullable=False,
                              default=datetime.utcnow)

    owner_user_id = db.Column(db.ForeignKey(User.id), nullable=False)

    description = db.Column(db.Unicode)

    __mapper_args__ = dict(polymorphic_on=cls)
    __table_args__ = (
        db.CheckConstraint('parent_id IS NOT NULL OR id = 0'),
        db.UniqueConstraint(parent_id, display_name),
    )

    parent = db.relationship(
        'Resource', remote_side=[id],
        backref=db.backref(
            'children', cascade=None,
            order_by=display_name))

    owner_user = db.relationship(User)

    def __str__(self):
        return self.display_name

    @classmethod
    def check_parent(cls, parent):
        """ Can this resource be child for parent? """
        return False

    @property
    def parents(self):
        """ List of all parents from root to current parent """
        result = []
        current = self
        while current.parent:
            current = current.parent
            result.append(current)

        return reversed(result)

    # Permissions

    @classmethod
    def class_permissions(cls):
        """ Permissions applicable to this resource class """

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
            return PermissionSets(
                allow=set(class_permissions),
                deny=set(), mask=set())

        allow = set()
        deny = set()
        mask = set()

        for res in tuple(self.parents) + (self, ):
            rules = filter(lambda rule: (
                (rule.propagate or res == self)
                and rule.cmp_identity(self.identity)  # NOQA: W503
                and rule.cmp_user(user)),  # NOQA: W503
                res.acl)

            for rule in rules:
                for perm in class_permissions:
                    if rule.cmp_permission(perm):
                        if rule.action == 'allow':
                            allow.add(perm)
                        elif rule.action == 'deny':
                            deny.add(perm)

        for scp in self.scope.values():
            for req in scp.requirements:
                for a in class_permissions:
                    if req.dst == a and (
                        req.cls is None
                        or isinstance(self, req.cls)  # NOQA: W503
                    ):
                        if req.attr is None:
                            p = req.src in allow \
                                and req.src not in deny \
                                and req.src not in mask
                        else:
                            attrval = getattr(self, req.attr)

                            if attrval is None:
                                p = req.attr_empty is True
                            else:
                                p = attrval.has_permission(req.src, user)

                        if not p:
                            mask.add(a)

        return PermissionSets(allow=allow, deny=deny, mask=mask)

    def permissions(self, user):
        sets = self.permission_sets(user)
        return sets.allow - sets.mask - sets.deny

    def has_permission(self, permission, user):
        return permission in self.permissions(user)

    def has_export_permission(self, user):
        try:
            value = env.core.settings_get('resource', 'resource_export')
        except KeyError:
            value = 'data_read'

        if value == 'administrators':
            return user.is_administrator

        if value == 'data_write':
            permission = DataScope.write
        else:
            permission = DataScope.read

        return self.has_permission(permission, user)

    # Data validation

    @db.validates('parent')
    def _validate_parent(self, key, value):
        """ Test for closed loops in hierarchy """

        with DBSession.no_autoflush:
            if value is not None:
                if self == value or self in value.parents:
                    raise HierarchyError(_("Resource can not be a parent himself."))

        return value

    @db.validates('keyname')
    def _validate_keyname(self, key, value):
        """ Test for key uniqueness """

        with DBSession.no_autoflush:
            if value is not None and Resource.filter(
                Resource.keyname == value,
                Resource.id != self.id
            ).first():
                raise ValidationError(_("Resource keyname is not unique."))

        return value

    @db.validates('owner_user')
    def _validate_owner_user(self, key, value):
        with DBSession.no_autoflush:
            if value.system and value.keyname != 'guest':
                raise ValidationError("System user cannot be a resource owner.")

        return value

    # Preview

    @classmethod
    def check_social_editable(cls):
        """ Can this resource social settings be editable? """
        return False


@event.listens_for(Resource, 'after_delete', propagate=True)
def resource_after_delete(mapper, connection, target):
    connection.execute(text('''
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
    '''), timestamp=datetime.utcnow(), resource_id=target.id)


ResourceScope.read.require(
    ResourceScope.read,
    attr='parent', attr_empty=True)


class _parent_attr(SRR):

    def writeperm(self, srlzr):
        return True

    def setter(self, srlzr, value):
        old_parent = srlzr.obj.parent
        super().setter(srlzr, value)

        if old_parent == srlzr.obj.parent:
            return

        if srlzr.obj.parent is None:
            raise ForbiddenError(_("Resource can not be without a parent."))

        for parent in (old_parent, srlzr.obj.parent):
            if parent is not None and not parent.has_permission(
                    ResourceScope.manage_children, srlzr.user):
                raise ForbiddenError(
                    _("You are not allowed to manage children of resource with id = %d.")
                    % parent.id)

        if not srlzr.obj.check_parent(srlzr.obj.parent):
            raise HierarchyError(
                _("Resource can not be a child of resource id = %d.")
                % srlzr.obj.parent.id)


class _owner_user_attr(SR):

    def setter(self, srlzr, value):
        if not srlzr.user.is_administrator:
            raise ForbiddenError(
                "Membership in group 'administrators' required!")
        return super().setter(srlzr, value)


class _perms_attr(SP):

    def setter(self, srlzr, value):
        for r in list(srlzr.obj.acl):
            srlzr.obj.acl.remove(r)

        for itm in value:
            rule = ResourceACLRule(
                identity=itm['identity'],
                scope=itm['scope'],
                permission=itm['permission'],
                propagate=itm['propagate'],
                action=itm['action'])

            rule.principal = Principal.filter_by(
                id=itm['principal']['id']).one()

            srlzr.obj.acl.append(rule)

    def getter(self, srlzr):
        result = []

        for o in srlzr.obj.acl:
            result.append(OrderedDict((
                ('action', o.action),
                ('principal', dict(id=o.principal_id)),
                ('identity', o.identity),
                ('scope', o.scope),
                ('permission', o.permission),
                ('propagate', o.propagate),
            )))

        return result


class _children_attr(SP):
    def getter(self, srlzr):
        return len(srlzr.obj.children) > 0


class _interfaces_attr(SP):
    def getter(self, srlzr):
        return [i.getName() for i in providedBy(srlzr.obj)]


class _scopes_attr(SP):
    def getter(self, srlzr):
        return list(srlzr.obj.scope.keys())


_scp = Resource.scope.resource


def _ro(c):
    return c(read=_scp.read, write=None, depth=2)


def _rw(c):
    return c(read=_scp.read, write=_scp.update, depth=2)


class ResourceSerializer(Serializer):
    identity = Resource.identity
    resclass = Resource

    id = _ro(SP)
    cls = _ro(SP)
    creation_date = _ro(SP)

    parent = _rw(_parent_attr)
    owner_user = _rw(_owner_user_attr)

    permissions = _perms_attr(read=_scp.read, write=_scp.change_permissions)

    keyname = _rw(SP)
    display_name = _rw(SP)

    description = SP(read=MetadataScope.read, write=MetadataScope.write)

    children = _ro(_children_attr)
    interfaces = _ro(_interfaces_attr)
    scopes = _ro(_scopes_attr)

    def deserialize(self, *args, **kwargs):
        # As the test for uniqueness within group is dependent on two attributes
        # (parent, display_name), it is possible to correctly check its completion
        # after serialization of both attributes.

        # Save old values to track changes
        parent, display_name = self.obj.parent, self.obj.display_name

        super().deserialize(*args, **kwargs)

        if parent != self.parent or display_name != self.display_name:
            with DBSession.no_autoflush:
                conflict = Resource.filter(
                    Resource.parent_id == self.obj.parent.id
                    if self.obj.parent is not None else None,
                    Resource.display_name == self.obj.display_name,
                    Resource.id != self.obj.id
                ).first()

            if conflict is not None:
                raise DisplayNameNotUnique(conflict.id)

        # Total quota checking
        quota_resource_cls = env.resource.quota_resource_cls
        quota_limit = env.resource.quota_limit

        if (
            quota_limit is not None and self.obj.id is None
            and (quota_resource_cls is None or self.obj.cls in quota_resource_cls)  # NOQA: W503
        ):
            query = DBSession.query(db.func.count(Resource.id))
            if quota_resource_cls is not None:
                query = query.filter(Resource.cls.in_(quota_resource_cls))

            with DBSession.no_autoflush:
                count = query.scalar()

            if count >= quota_limit:
                raise ValidationError(_(
                    "Maximum number of resources exceeded. The limit is %s."
                ) % (quota_limit,))

        # Quota per resource class checking
        quota_resource_by_cls = env.resource.quota_resource_by_cls

        if self.obj.id is None and self.obj.cls in quota_resource_by_cls:
            query = DBSession\
                .query(db.func.count(Resource.id))\
                .filter(Resource.cls == self.obj.cls)

            with DBSession.no_autoflush:
                count = query.scalar()

            quota = quota_resource_by_cls[self.obj.cls]
            if count >= quota:
                raise ValidationError(_(
                    "Maximum number of resources '%s' exceeded. The limit is %s."
                ) % (self.obj.cls_display_name, quota))


class ResourceACLRule(Base):
    __tablename__ = "resource_acl_rule"

    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    principal_id = db.Column(db.ForeignKey(Principal.id), primary_key=True)

    identity = db.Column(db.Unicode, primary_key=True, default='')
    identity.__doc__ = """
        Тип ресурса для которого действует это правило. Пустая строка
        означает, что оно действует для всех типов ресурсов."""

    # Permission for which this rule is applicable. Empty line means
    # full set of permissions for all types of resources.
    scope = db.Column(db.Unicode, primary_key=True, default='')
    permission = db.Column(db.Unicode, primary_key=True, default='')

    propagate = db.Column(db.Boolean, primary_key=True, default=True)
    propagate.__doc__ = """
        Следует ли распространять действие этого правила на дочерние ресурсы
        или оно действует только на ресурс в котором указано."""

    action = db.Column(db.Unicode, nullable=False, default=True)
    action.__doc__ = """
        Действие над правом: allow (разрешение) или deny (запрет). При этом
        правила запрета имеют приоритет над разрешениями."""

    resource = db.relationship(
        Resource, backref=db.backref(
            'acl', cascade='all, delete-orphan'))

    principal = db.relationship(Principal)

    def cmp_user(self, user):
        principal = self.principal
        return (isinstance(principal, User) and principal.compare(user)) \
            or (isinstance(principal, Group) and principal.is_member(user))

    def cmp_identity(self, identity):
        return (self.identity == '') or (self.identity == identity)

    def cmp_permission(self, permission):
        pname = permission.name
        pscope = permission.scope.identity

        return ((self.scope == '' and self.permission == '')
                or (self.scope == pscope and self.permission == '')  # NOQA: W503
                or (self.scope == pscope and self.permission == pname))  # NOQA: W503


@Principal.on_find_references.handler
def _on_find_references(event):
    principal = event.principal
    data = event.data

    for acl in ResourceACLRule.filter_by(principal_id=principal.id).all():
        resource = acl.resource
        data.append(OnFindReferencesData(
            cls=resource.cls, id=resource.id, autoremove=False))

    if isinstance(principal, User):
        for resource in Resource.filter_by(owner_user_id=principal.id).all():
            data.append(OnFindReferencesData(
                cls=resource.cls, id=resource.id, autoremove=False))


class ResourceGroup(Resource):
    identity = 'resource_group'
    cls_display_name = _("Resource group")

    @classmethod
    def check_parent(cls, parent):
        # Group can be either root or subgroup in other group
        return (parent is None) or isinstance(parent, ResourceGroup)
