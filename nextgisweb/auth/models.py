# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..models import Base

tab_group_user = sa.Table(
    'auth_group_user', Base.metadata,
    sa.Column('group_id', sa.Integer, sa.ForeignKey('auth_group.principal_id'), primary_key=True),
    sa.Column('user_id', sa.Integer, sa.ForeignKey('auth_user.principal_id'), primary_key=True)
)


class Principal(Base):
    __tablename__ = 'auth_principal'

    id = sa.Column(sa.Integer, sa.Sequence('principal_seq'), primary_key=True)
    cls = sa.Column(sa.Unicode(1), nullable=False)
    system = sa.Column(sa.Boolean, nullable=False, default=False)
    display_name = sa.Column(sa.Unicode, nullable=False)

    __mapper_args__ = dict(
        polymorphic_on=cls,
        with_polymorphic='*'
    )


class User(Principal):
    __tablename__ = 'auth_user'

    principal_id = sa.Column(sa.Integer, sa.Sequence('principal_seq'), sa.ForeignKey(Principal.id), primary_key=True)
    keyname = sa.Column(sa.Unicode, unique=True)
    password = sa.Column(sa.Unicode)

    __mapper_args__ = dict(polymorphic_identity='U')

    principal = orm.relationship(Principal)

    def __unicode__(self):
        return self.display_name

    def compare(self, other):
        """ Сравнение двух пользователей с учетом особых пользователей """

        # Если ни один из пользователей не особый, то обычное сравнение
        if not self.system and not other.system:
            return self == other

        elif self.system:
            a, b = self, other

        elif other.system:
            a, b = other, self

        # Теперь a - особый пользователь, b - обычный

        if a.keyname == 'everyone':
            return True

        elif a.keyname == 'authenticated':
            return b.keyname != 'guest'

        elif b.keyname == 'authenticated':
            return a.keyname != 'guest'

        else:
            return a == b


class Group(Principal):
    __tablename__ = 'auth_group'

    principal_id = sa.Column(sa.Integer, sa.Sequence('principal_seq'), sa.ForeignKey(Principal.id), primary_key=True)
    keyname = sa.Column(sa.Unicode, unique=True)

    members = orm.relationship(User, secondary=tab_group_user, backref=orm.backref('member_of'))

    __mapper_args__ = dict(polymorphic_identity='G')

    principal = orm.relationship(Principal)

    def __unicode__(self):
        return self.display_name

    def is_member(self, user):
        if self.keyname == 'authorized':
            return user is not None and user.keyname != 'guest'

        elif self.keyname == 'everyone':
            return user is not None

        else:
            return user in self.members


def initialize(comp):

    comp.Principal = Principal
    comp.User = User
    comp.Group = Group
