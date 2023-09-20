from warnings import warn

from sqlalchemy.orm import declarative_base as sa_declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.orm.attributes import InstrumentedAttribute
from zope.sqlalchemy import register

from .component import component_utility
from .package import pkginfo

DBSession = scoped_session(sessionmaker(expire_on_commit=False))
register(DBSession)


class BaseClass:
    def __init__(self, **kwargs):
        cls = type(self)
        for k, v in kwargs.items():
            clsattr = type(getattr(cls, k))
            if issubclass(clsattr, InstrumentedAttribute):
                setattr(self, k, v)

        self.postinit(**kwargs)

    def postinit(self, **kwargs):
        sup = super()
        if hasattr(sup, "postinit"):
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
    warn(
        "Usage of declarative_base() isn't encouraged since nextgisweb >= 4.5.0.dev6. Use "
        "'from nextgisweb.env import Base' instead.",
        DeprecationWarning,
        stacklevel=2,
    )

    result = _base()
    if dependencies:
        result.metadata.dependencies.extend(dependencies)
    return result


def _base_factory(comp_id):
    result = sa_declarative_base(cls=BaseClass, constructor=None, class_registry=_CLASS_REGISTRY)
    result.metadata.dependencies = []

    def depends_on(*other_component_ids):
        for cid in other_component_ids:
            assert cid in pkginfo.components
            result.metadata.dependencies.append(cid)

    result.depends_on = depends_on
    return result


_base = component_utility(_base_factory)
