# -*- coding: utf-8 -*-
import warnings
import sqlalchemy.exc
from sqlalchemy.ext.declarative import declarative_base as sa_declarative_base
from sqlalchemy.orm import Query as SAQuery, scoped_session, sessionmaker
from sqlalchemy.orm.attributes import InstrumentedAttribute
from sqlalchemy.orm.exc import NoResultFound, MultipleResultsFound
from zope.sqlalchemy import ZopeTransactionExtension

from ..error import provide_error_info

# Ignore SQLAlchemy unicode warnings
warnings.filterwarnings('ignore', '^Unicode type received non-unicode bind param value', sqlalchemy.exc.SAWarning)  # NOQA


class Query(SAQuery):

    def one_or_error(self, message=None, data=None, http_status_code=404):
        try:
            return self.one()
        except NoResultFound as exc:
            provide_error_info(
                exc, http_status_code=http_status_code,
                message=message if message else "No result found")
            raise
        except MultipleResultsFound as exc:
            provide_error_info(
                exc, http_status_code=http_status_code,
                message=message if message else "Multiple results found")
            raise


DBSession = scoped_session(
    sessionmaker(query_cls=Query, extension=ZopeTransactionExtension()))


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
