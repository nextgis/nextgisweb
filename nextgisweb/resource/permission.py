from __future__ import annotations

from collections.abc import Iterator, Sequence
from dataclasses import dataclass
from graphlib import TopologicalSorter
from typing import ClassVar, Final, Self

from nextgisweb.lib.i18n import TrStr
from nextgisweb.lib.registry import DictRegistry

from . import model


class Requirements:
    def __init__(self) -> None:
        self._list = list[Requirement]()
        self._dirty = False

    def add(self, requirement: Requirement) -> None:
        self._list.append(requirement)
        self._dirty = True

    def __iter__(self) -> Iterator[Requirement]:
        if self._dirty:
            self._sort()
            self._dirty = False
        return iter(self._list)

    def _sort(self) -> None:
        # Split on internal and external requirements
        internal: list[Requirement] = []
        external: list[Requirement] = []
        for req in self._list:
            (internal, external)[req.attr is not None].append(req)

        # Topological sort internal requirements
        internal_graph = {a: {b for b in internal if a != b and a.src == b.dst} for a in internal}
        internal[:] = TopologicalSorter(internal_graph).static_order()

        # Sort external requirements by attribute, with "parent" first
        external.sort(key=lambda req: (0 if req.attr == "parent" else 1, req.attr))

        self._list[:] = [*external, *internal]


@dataclass(frozen=True)
class Requirement:
    dst: Permission
    src: Permission
    attr: str | None = None
    cls: type[model.Resource] | None = None
    attr_empty: bool = False


class Permission:
    def __init__(self, label: TrStr) -> None:
        self.label: Final = label

        self._scope: type[Scope] | None = None
        self._name: str | None = None

        self.requirements: Final = Requirements()

    def __set_name__(self, scope: type[Scope], name: str) -> None:
        assert issubclass(scope, Scope)
        assert self._scope is None and self._name is None

        self._scope = scope
        self._name = name

        scope._register_permission(self)

    def __repr__(self) -> str:
        return f"<Permission: {str(self)}>"

    def __str__(self) -> str:
        return "unbound" if self._scope is None else f"{self._scope.identity}:{self._name}"

    @property
    def scope(self) -> type[Scope]:
        if self._scope is None:
            raise TypeError(f"Permission {self} is not bound")
        return self._scope

    @property
    def name(self) -> str:
        if self._name is None:
            raise TypeError(f"Permission {self} is not bound")
        return self._name

    def require(
        self,
        other: Permission,
        /,
        *,
        attr: str | None = None,
        cls: type[model.Resource] | None = None,
        attr_empty: bool = False,
    ) -> Self:
        req = Requirement(self, other, attr=attr, attr_empty=attr_empty, cls=cls)
        self.requirements.add(req)

        if self._scope is not None:
            self._scope.requirements.add(req)

        return self


class Scope:
    registry: ClassVar[DictRegistry[type[Scope]]] = DictRegistry()

    identity: ClassVar[str]
    label: ClassVar[TrStr]

    permissions: ClassVar[Sequence[Permission]]
    requirements: ClassVar[Requirements]

    def __init_subclass__(cls) -> None:
        super().__init_subclass__()

        assert isinstance(cls.identity, str)
        if cls.__bases__ != (Scope,):
            raise TypeError(f"Must inherit directly from Scope, not {cls.__bases__}")

        assert getattr(cls, "permissions", []), "Scope without permissions"

        cls.registry.register(cls)

    @classmethod
    def _register_permission(cls, perm: Permission) -> None:
        if (permissions := cls.__dict__.get("permissions")) is None:
            permissions = cls.permissions = list[Permission]()

        assert perm not in permissions
        permissions.append(perm)

        if (requirements := cls.__dict__.get("requirements")) is None:
            requirements = cls.requirements = Requirements()

        for req in perm.requirements._list:
            requirements.add(req)
