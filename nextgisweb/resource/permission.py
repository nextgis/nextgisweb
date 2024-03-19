from collections import UserList
from functools import reduce
from typing import ClassVar, Type, Union

from nextgisweb.lib.i18n import TrStr
from nextgisweb.lib.registry import DictRegistry


class RequirementList(UserList):
    def toposort(self):
        # Split on internal (attr is None) and external requirements
        internal, external = list(), list()
        for req in self:
            (internal, external)[req.attr is not None].append(req)

        # Build graph of internal requirements
        g = dict()
        for a in internal:
            g[a] = set()
            for b in internal:
                if a.src == b.dst and a != b:
                    g[a].add(b)

        # Put external requirements first
        self[:] = list(external)

        # Sort internal
        extra = reduce(set.union, g.values(), set()) - set(g.keys())
        g.update({item: set() for item in extra})
        while True:
            ordered = set(item for item, dep in g.items() if not dep)
            if not ordered:
                break

            # Add sorted internal requirements after externals
            self.extend(ordered)
            g = {item: (dep - ordered) for item, dep in g.items() if item not in ordered}

        assert not g, "A cyclic dependency exists amongst %r" % g


class Requirement:
    def __init__(
        self,
        dst: "Permission",
        src: "Permission",
        attr: Union[str, None] = None,
        cls: Union[Type, None] = None,
        attr_empty: bool = False,
    ):
        self.dst = dst
        self.src = src
        self.attr = attr
        self.cls = cls
        self.attr_empty = attr_empty

    def __repr__(self):
        crepr = f" FOR {self.cls.identity}" if self.cls else ""
        arepr = f" ON {self.attr}{' IF SET' if self.attr_empty else ''}" if self.attr else ""
        return f"<Requirement{crepr}: {self.dst} REQUIRES {self.src}{arepr}>"


class Permission:
    def __init__(self, label: TrStr):
        self.scope = None
        self.name = None

        self.label = label
        self._requirements = list()

    def __repr__(self):
        if self.scope is None:
            assert self.name is None
            return "<Permission: unbound>"
        else:
            assert self.name is not None
            return f"<Permission: {self.scope.identity}.{self.name}>"

    def __str__(self):
        return "unbound" if self.scope is None else f"{self.scope.identity}:{self.name}"

    def is_bound(self):
        return self.name is not None and self.scope is not None

    def bind(self, name: str, scope: Type["Scope"]):
        assert isinstance(name, str) and issubclass(scope, Scope)
        assert self.name is None and self.scope is None
        self.name = name
        self.scope = scope

        self.scope.requirements.extend(self._requirements)
        self.scope.requirements.toposort()
        del self._requirements

    def require(self, other: "Permission", attr=None, cls=None, attr_empty=False):
        req = Requirement(self, other, attr=attr, attr_empty=attr_empty, cls=cls)

        if self.scope is None:
            self._requirements.append(req)
        else:
            self.scope.requirements.append(req)
            self.scope.requirements.toposort()

        return self


scope_registry = DictRegistry()


class ScopeMeta(type):
    def __new__(cls, name, bases, nmspc, *, abstract=False, **kwargs):
        return super().__new__(cls, name, bases, nmspc, **kwargs)

    def __init__(cls, classname, bases, nmspc, *, abstract=False):
        if not abstract:
            identity = nmspc.get("identity")
            assert isinstance(identity, str)
            setattr(cls, "requirements", RequirementList())
            scope_registry.register(cls)

        for name, perm in cls.__dict__.items():
            if isinstance(perm, Permission):
                perm.bind(name, scope=cls)

        super().__init__(classname, bases, nmspc)

    def values(cls, **kwargs):
        assert len(kwargs) == 0
        yield from (p for p in cls.__dict__.values() if isinstance(p, Permission))


class Scope(metaclass=ScopeMeta, abstract=True):
    registry: ClassVar[DictRegistry] = scope_registry
    identity: ClassVar[str]
    label: ClassVar[TrStr]
    requirements: ClassVar[RequirementList]
