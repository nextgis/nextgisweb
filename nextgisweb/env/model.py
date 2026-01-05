from __future__ import annotations

from typing import TYPE_CHECKING, ClassVar

from sqlalchemy import MetaData as SAMetadata
from sqlalchemy.orm import (
    DeclarativeMeta,
    InstrumentedAttribute,
    registry,
    scoped_session,
    sessionmaker,
)
from typing_extensions import Self
from zope.sqlalchemy import register

from nextgisweb.lib.logging import logger

from .component import component_utility
from .package import pkginfo

if TYPE_CHECKING:
    from .environment import Env

DBSession = scoped_session(sessionmaker(expire_on_commit=False))
register(DBSession)


class MetaData(SAMetadata):
    dependencies: list[str]

    def __init__(self) -> None:
        super().__init__()
        self.dependencies = []


class Base(metaclass=DeclarativeMeta):
    __abstract__ = True

    registry: ClassVar = registry()
    """SQLAlchemy registry instance"""

    component_metadata: ClassVar[dict[str, MetaData]] = {}
    """Per-component MetaData instaces"""

    def __init_subclass__(cls):
        if not cls.__dict__.get("__abstract__", False):
            # Assign component-specific metadata, especially for joined table
            # inheritance, which takes place for every resource class.
            cident = pkginfo.component_by_module(cls.__module__)
            assert cident is not None
            metadata = _base(cident=cident).metadata
            setattr(cls, "metadata", metadata)
        return super().__init_subclass__()

    @classmethod
    def factory(cls, cident: str) -> type[Self]:
        if not (metadata := cls.component_metadata.get(cident)):
            metadata = MetaData()
            cls.component_metadata[cident] = metadata

        return type(
            f"Base_{cident.upper()}",
            (cls,),
            {"__abstract__": True, "metadata": metadata},
        )  # type: ignore

    @classmethod
    def depends_on(cls, *other_component_ids: str) -> None:
        for cid in other_component_ids:
            assert cid in pkginfo.components
            assert isinstance(cls.metadata, MetaData)
            cls.metadata.dependencies.append(cid)

    @classmethod
    def loaded(cls, env: Env):
        total = 0
        for k, v in cls.component_metadata.items():
            comp = env.components[k]
            tables = v.tables.values()
            logger.debug("%s: %s", comp.__class__.__name__, ", ".join(t.name for t in tables))
            total += len(v.tables)
        logger.info("Loaded %d tables from %d components", total, len(cls.component_metadata))

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


_base = component_utility(Base.factory)
