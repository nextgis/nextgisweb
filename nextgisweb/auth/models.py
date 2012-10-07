# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..models import Base

tab_group_user = sa.Table(
    'auth_group_user', Base.metadata,
    sa.Column('group_id', sa.Integer, sa.ForeignKey('auth_group.principal_id'), nullable=False),
    sa.Column('user_id', sa.Integer, sa.ForeignKey('auth_user.principal_id'), nullable=False)
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


class Group(Principal):
    __tablename__ = 'auth_group'

    principal_id = sa.Column(sa.Integer, sa.Sequence('principal_seq'), sa.ForeignKey(Principal.id), primary_key=True)
    keyname = sa.Column(sa.Unicode, unique=True)

    members = orm.relationship(User, secondary=tab_group_user, backref=orm.backref('member_of'))

    __mapper_args__ = dict(polymorphic_identity='G')

    principal = orm.relationship(Principal)

    def __unicode__(self):
        return self.display_name
