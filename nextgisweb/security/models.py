# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..models.base import Base

tab_scope_category = sa.Table(
    'permission_scope_category', Base.metadata,
    sa.Column('scope_keyname', sa.Unicode, sa.ForeignKey('permission_scope.keyname'), nullable=False),
    sa.Column('category_keyname', sa.Unicode, sa.ForeignKey('permission_category.keyname'), nullable=False)
)


class PermissionScope(Base):
    """
    Область применения прав доступа, состояща из групп.

    Идея состоит в следующем. Одни и те же группы прав могут применяться к
    различным объектам, особеннов случае наследования прав по иерархии.  """

    __tablename__ = 'permission_scope'

    keyname = sa.Column(sa.Unicode, primary_key=True)
    display_name = sa.Column(sa.Unicode, nullable=False)

    categories = orm.relationship(
        'PermissionCategory',
        secondary=tab_scope_category,
        backref=orm.backref('scopes')
    )


class PermissionCategory(Base):
    __tablename__ = 'permission_category'

    keyname = sa.Column(sa.Unicode, primary_key=True)
    display_name = sa.Column(sa.Unicode, nullable=False)

    permissions = orm.relationship('Permission', lazy='joined')


class Permission(Base):
    __tablename__ = 'permission'

    category_keyname = sa.Column(
        sa.Unicode,
        sa.ForeignKey(PermissionCategory.keyname),
        primary_key=True)
    keyname = sa.Column(sa.Unicode, primary_key=True)
    display_name = sa.Column(sa.Unicode, nullable=False)

    category = orm.relationship(PermissionCategory)

    def __unicode__(self):
        return '%s:%s' % (self.category.display_name, self.display_name)


class ACL(Base):
    __tablename__ = 'acl'

    id = sa.Column(sa.Integer, primary_key=True)
    parent_id = sa.Column(sa.Integer, sa.ForeignKey('acl.id'))
    user_id = sa.Column(sa.Integer, sa.ForeignKey('auth_user.principal_id'))
    scope_keyname = sa.Column(sa.Unicode, sa.ForeignKey(PermissionScope.keyname))

    parent = orm.relationship('ACL', remote_side=[id, ])
    user = orm.relationship('User')
    items = orm.relationship('ACLItem')

    def get_effective_permissions(self, user):
        resultset = set()

        def traverse_items(start):
            if start.parent:
                for i in traverse_items(start.parent):
                    yield i

            for i in start.items:
                yield i

        for item in traverse_items(self):
            if item.principal == user or item.principal in user.member_of:
                if item.permission_keyname == '*':
                    for p in item.category.permissions:
                        if p.keyname != '*':
                            resultset.add('%s:%s' % (item.category_keyname, p.keyname))
                else:
                    resultset.add('%s:%s' % (item.category_keyname, item.permission_keyname))

        return resultset


class ACLItem(Base):
    __tablename__ = 'acl_item'

    acl_id = sa.Column(sa.Integer, sa.ForeignKey(ACL.id), primary_key=True)
    principal_id = sa.Column(sa.Integer, sa.ForeignKey('auth_principal.id'), primary_key=True)
    category_keyname = sa.Column(sa.Unicode, sa.ForeignKey(PermissionCategory.keyname), primary_key=True)
    permission_keyname = sa.Column(sa.Unicode, primary_key=True)

    __table_args__ = (
        sa.ForeignKeyConstraint(
            (category_keyname, permission_keyname),
            (Permission.category_keyname, Permission.keyname)
        ),
    )

    acl = orm.relationship('ACL')
    principal = orm.relationship('Principal')
    category = orm.relationship('PermissionCategory', lazy='joined')
    permission = orm.relationship('Permission', lazy='joined')


class ACLGlobal(Base):
    __tablename__ = 'acl_global'

    keyname = sa.Column(sa.Unicode, primary_key=True)
    acl_id = sa.Column(sa.Integer, sa.ForeignKey(ACL.id), nullable=False)
    display_name = sa.Column(sa.Unicode)
