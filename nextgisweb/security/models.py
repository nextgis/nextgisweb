# -*- coding: utf-8 -*-
from collections import defaultdict

import sqlalchemy as sa
import sqlalchemy.orm as orm
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.ext.hybrid import hybrid_property

from ..models import declarative_base
from ..env import env
from ..auth import Principal, User, Group


Base = declarative_base()


class PMATCH(object):
    USER = 'U'
    GROUP = 'G'


class POPER(object):
    DENY = 'D'
    ALLOW = 'A'
    INHERIT = 'I'


PERMISSION_ALL = ''


def permission_set(itemstack, permissions=None):
    slots = defaultdict(dict)

    resetnext = set()

    for level_items in itemstack:

        # Разворачиваем элементы с PERMISSION_ALL
        items = []
        for itm in level_items:
            perm, match, oper, prop = itm

            if perm != PERMISSION_ALL:
                items.append(itm)

            else:
                assert permissions is not None
                for perm in permissions:
                    items.append((perm, match, oper, prop))

        # Сбрасываем элементы без распространения
        for perm, match, oper in resetnext:
            reset = []

            if oper == POPER.INHERIT:
                reset.append((match, POPER.ALLOW))
                reset.append((match, POPER.DENY))

                # Сброс распространенных разрешений по пользователю
                # так же сбрасывет разрешения полученные по группе
                if match == PMATCH.USER:
                    reset.append((PMATCH.GROUP, POPER.ALLOW))
                    reset.append((PMATCH.GROUP, POPER.DENY))

            else:
                # Предотвращаем распространение
                reset.append((match, oper))

            for row in reset:
                slots[perm][row] = False

        resetnext = set()

        for item in items:
            perm, match, oper, prop = item

            if oper in (POPER.DENY, POPER.ALLOW):
                slots[perm][(match, oper)] = True

            # На следующей итерации пректарим распространение
            if not prop:
                resetnext.add((perm, match, oper))

    result = set()

    for perm, val in slots.iteritems():
        v = lambda k: val.get(tuple(k), False)

        if (
            (v('UA') and not v('UD'))
            or (v('GA') and not v('GD') and not v('UD'))
        ):
            result.add(perm)

    return result


class ACL(Base):
    __tablename__ = 'acl'

    id = sa.Column(sa.Integer, primary_key=True)
    parent_id = sa.Column(sa.ForeignKey(id))
    owner_user_id = sa.Column(sa.ForeignKey(User.principal_id))
    resource = sa.Column(sa.Unicode, nullable=False)

    parent = orm.relationship('ACL', remote_side=[id, ])
    owner_user = orm.relationship('User')
    items = orm.relationship(
        'ACLItem',
        cascade='all, delete-orphan',
        passive_deletes=True,
        backref=orm.backref('acl')
    )

    def __init__(self, *args, **kwargs):
        super(ACL, self).__init__(*args, **kwargs)

        self._permset_cache = dict()

    @orm.reconstructor
    def orm_init(self):
        self._permset_cache = dict()

    def update(self, items, replace=False):
        operations = dict(map(lambda itm: (itm[:-1], itm[-1]), items))

        # Исправляем существующие записи
        seen = set()
        remove = list()
        for item in self.items:
            key = (item.principal_id, item.resource, item.permission)

            if key in operations:
                item.operation = operations[key]
                seen.add(key)

            elif replace:
                remove.append(item)

        # Удаляем отмеченные для удаления записи
        for i in remove:
            self.items.remove(i)

        # Добавляем новые
        for key, operation in operations.iteritems():
            if key not in seen:
                self.items.append(ACLItem(
                    **dict(zip(
                        ('principal_id', 'resource', 'permission'),
                        key
                    ), operation=operation)
                ))

        # Сбрасываем кэш
        self._permset_cache = dict()

    def permission_set(self, user):
        if user.id in self._permset_cache:
            return self._permset_cache[user.id]

        itemstack = []

        acl = self
        while acl:
            items = []
            itemstack.insert(0, items)

            for itm in acl.items:
                if itm.resource != self.resource:
                    continue

                if (
                    isinstance(itm.principal, User)
                    and (
                        # Сравнение с учетом виртуальных пользователей
                        itm.principal.compare(user)

                        # Специальный случай: в ACL указан владелец
                        or (
                            itm.principal.keyname == 'owner'
                            and user == self.owner_user
                        )
                    )
                ):
                    match = PMATCH.USER

                elif (
                    isinstance(itm.principal, Group)
                    and itm.principal.is_member(user)
                ):
                    match = PMATCH.GROUP

                else:
                    continue

                items.append((
                    itm.permission,
                    match,
                    itm.poper,
                    itm.propagate
                ))

            acl = acl.parent

        result = permission_set(
            itemstack,
            permissions=env.security.permissions[self.resource].keys()
        )

        self._permset_cache = result
        return result

    def has_permission(self, user, *permissions):
        permset = self.permission_set(user)

        for permission in permissions:
            if permission not in permset:
                return False

        return True


class ACLItem(Base):
    __tablename__ = 'acl_item'

    acl_id = sa.Column(sa.ForeignKey(ACL.id), primary_key=True)
    principal_id = sa.Column(sa.ForeignKey(Principal.id), primary_key=True)
    resource = sa.Column(sa.Unicode, primary_key=True)
    permission = sa.Column(sa.Unicode, primary_key=True)
    operation = sa.Column(sa.Unicode, primary_key=True)

    principal = orm.relationship('Principal')

    @property
    def poper(self):
        if self.operation.startswith('allow-'):
            return POPER.ALLOW

        elif self.operation.startswith('deny-'):
            return POPER.DENY

        elif self.operation.startswith('inherit-'):
            return POPER.INHERIT

    @property
    def propagate(self):
        if self.operation.endswith('-subtree'):
            return True

        elif self.operation.endswith('-node'):
            return False


class ResourceACLRoot(Base):
    __tablename__ = 'resource_acl_root'

    resource = sa.Column(sa.Unicode, primary_key=True)
    acl_id = sa.Column(sa.ForeignKey(ACL.id), nullable=False)

    acl = orm.relationship(ACL, lazy='joined')

    def __init__(self, resource, **kwargs):
        self.resource = resource
        self.acl = ACL(resource=resource)


class ACLMixin(object):

    @declared_attr
    def acl_id(cls):
        return sa.Column(sa.ForeignKey(ACL.id), nullable=False)

    @declared_attr
    def acl(cls):
        return orm.relationship(
            ACL,
            cascade='all',
            lazy='joined'
        )

    def postinit(self, **kwargs):
        if 'acl' not in kwargs and 'acl_id' not in kwargs:

            parent_attr = (
                self.__acl_parent_attr__
                if hasattr(self, '__acl_parent_attr__')
                else None
            )
            aclkwargs = dict(resource=self.__acl_resource__)

            if kwargs.get(parent_attr) is not None:
                # Если у элемента есть ресурс-родитель, используем его ACL
                aclkwargs['parent_id'] = kwargs[parent_attr].acl_id

            else:
                # Если нет используем ACL коренного элемент ресурса
                aclkwargs['parent_id'] = ResourceACLRoot.query() \
                    .get(self.__acl_resource__).acl_id

            if 'owner_user' in kwargs:
                aclkwargs['owner_user'] = kwargs['owner_user']

            elif 'owner_user_id' in kwargs:
                aclkwargs['owner_user_id'] = kwargs['owner_user_id']

            self.acl = ACL(**aclkwargs)

        super(ACLMixin, self).postinit(**kwargs)

    def permission_set(self, *args, **kwargs):
        return self.acl.permission_set(*args, **kwargs)

    def has_permission(self, *args, **kwargs):
        return self.acl.has_permission(*args, **kwargs)

    def owner_user():

        def fget(self):
            return self.acl.owner_user

        def fset(self, value):
            self.acl.owner_user = value

        return locals()

    owner_user = property(**owner_user())

    @hybrid_property
    def acl_root(self):
        """ Быстрый способ доступа к базовому списку контроля доступа """

        return ResourceACLRoot.query().get(self.__acl_resource__).acl
