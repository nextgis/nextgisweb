from sqlalchemy.orm import declarative_base as sa_declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.orm.attributes import InstrumentedAttribute
from zope.sqlalchemy import register

from .component import component_utility
from .package import pkginfo

DBSession = scoped_session(sessionmaker(expire_on_commit=False, future=True))
register(DBSession)


class BaseClass:
    __sealed = False

    def __init__(self, **kwargs):
        cls = type(self)
        for k, v in kwargs.items():
            clsattr = type(getattr(cls, k))
            if issubclass(clsattr, InstrumentedAttribute):
                setattr(self, k, v)

        self.postinit(**kwargs)

    def __init_subclass__(cls):
        # TODO: Enable eventually, bt currently it breaks jsrealm install as it
        # requires to load all components including disabled:
        # assert (
        #     not cls.__sealed or cls.__name__ == "Base"
        # ), f"Subclassing {cls.__name__} on sealed Base"
        return super().__init_subclass__()

    @classmethod
    def seal_base(cls):
        cls.__sealed = True

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


def _base_factory(comp_id):
    result = sa_declarative_base(cls=BaseClass, constructor=None, class_registry=_CLASS_REGISTRY)
    result.metadata.dependencies = []

    def depends_on(*other_component_ids):
        for cid in other_component_ids:
            assert cid in pkginfo.components
            result.metadata.dependencies.append(cid)

    result.depends_on = depends_on
    result.__allow_unmapped__ = True
    return result


_base = component_utility(_base_factory)
