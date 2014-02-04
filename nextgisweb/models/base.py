# -*- coding: utf-8 -*-
from sqlalchemy.ext.declarative import declarative_base as sa_declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.orm.attributes import InstrumentedAttribute
from zope.sqlalchemy import ZopeTransactionExtension

DBSession = scoped_session(sessionmaker(extension=ZopeTransactionExtension()))


class BaseClass(object):

    def __init__(self, **kwargs):
        cls = type(self)
        for k, v in kwargs.iteritems():
            if not hasattr(cls, k):
                continue

            clsattr = type(getattr(cls, k))
            if issubclass(clsattr, InstrumentedAttribute):
                setattr(self, k, v)

        self.postinit(**kwargs)

    def postinit(self, **kwargs):
        sup = super(BaseClass, self)
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


def declarative_base():
    return sa_declarative_base(
        cls=BaseClass,
        constructor=None,
        class_registry=_CLASS_REGISTRY,
    )

Base = declarative_base()
