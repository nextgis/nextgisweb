from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy.orm import (
    declarative_base as sa_declarative_base,
    scoped_session,
    sessionmaker,
)
from sqlalchemy.orm.attributes import InstrumentedAttribute
from zope.sqlalchemy import register

DBSession = scoped_session(sessionmaker(expire_on_commit=False))
register(DBSession)


class BaseClass(object):

    def __init__(self, **kwargs):
        cls = type(self)
        for k, v in kwargs.items():
            if not hasattr(cls, k):
                continue

            clsattr = type(getattr(cls, k))
            if issubclass(clsattr, InstrumentedAttribute):
                setattr(self, k, v)

        self.postinit(**kwargs)

    def postinit(self, **kwargs):
        sup = super()
        if hasattr(sup, 'postinit'):
            sup.postinit(**kwargs)

    @classmethod
    def query(cls, *args):
        return DBSession.query(cls, *args)

    @classmethod
    def filter(cls, *args):
        return DBSession.query(cls).filter(*args)

    @classmethod
    def filter_by(cls, **kwargs):
        return DBSession.query(cls).filter_by(**kwargs)

    def persist(self):
        DBSession.add(self)
        return self


_CLASS_REGISTRY = dict()


def declarative_base(dependencies=None):
    result = sa_declarative_base(
        cls=BaseClass,
        constructor=None,
        class_registry=_CLASS_REGISTRY,
    )
    dependencies = () if dependencies is None else dependencies
    result.metadata.dependencies = dependencies
    return result


Base = declarative_base()


def migrate_operation():
    connection = DBSession.connection()
    ctx = MigrationContext.configure(connection)
    return Operations(ctx)
