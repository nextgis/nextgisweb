# -*- coding: utf-8 -*-
from collections import defaultdict

import sqlalchemy as sa
import sqlalchemy.orm as orm


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


def initialize(comp):
    Base = comp.env.core.Base
    User = comp.env.auth.User
    Group = comp.env.auth.Group

    class ACL(Base):
        __tablename__ = 'acl'

        id = sa.Column(sa.Integer, primary_key=True)
        parent_id = sa.Column(sa.Integer, sa.ForeignKey('acl.id'), nullable=True)
        owner_user_id = sa.Column(sa.ForeignKey('auth_user.principal_id'))
        resource = sa.Column(sa.Unicode, nullable=False)

        parent = orm.relationship('ACL', remote_side=[id, ])
        owner_user = orm.relationship('User')
        items = orm.relationship(
            'ACLItem',
            cascade='all, delete-orphan',
            passive_deletes=True,
            backref=orm.backref('acl')
        )

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

        def permission_set(self, user):
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
                        and itm.principal == user
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

            print itemstack
            return permission_set(
                itemstack,
                permissions=comp.permissions[self.resource].keys()
            )

    comp.ACL = ACL

    class ACLItem(Base):
        __tablename__ = 'acl_item'

        acl_id = sa.Column(sa.Integer, sa.ForeignKey(ACL.id, ondelete="CASCADE"), primary_key=True)
        principal_id = sa.Column(sa.Integer, sa.ForeignKey('auth_principal.id'), primary_key=True)
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

    comp.ACLItem = ACLItem
