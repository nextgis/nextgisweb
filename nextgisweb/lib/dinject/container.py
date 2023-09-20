from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from inspect import formatannotationrelativeto
from typing import Any, Callable, Dict, Hashable, List, Optional, Tuple, Type, TypeVar

KeyType = Tuple[Hashable, ...]
TContainer = TypeVar("TContainer", bound="Container")


class Container:
    _instance: Optional[Container] = None
    _container_registry: Dict[KeyType, Any]
    _container_invalidate: Dict[KeyType, List[Callable[[], None]]]

    def __init__(self) -> None:
        self._container_registry = dict()
        self._container_invalidate = defaultdict(list)

    def wire(self: TContainer) -> TContainer:
        cls = self.__class__
        if cls._instance is not None:
            raise ContainerWiredError(cls, self)
        cls._instance = self

        return self

    def unwire(self: TContainer) -> TContainer:
        if self.__class__._instance is None:
            raise ContainerNotWiredError

        for cbs in self._container_invalidate.values():
            for cb in cbs:
                cb()
            cbs[:] = []

        return self

    def register(
        self,
        tdef: Hashable,
        value: Any,
        *,
        selector: Tuple[Hashable, ...] = (),
    ) -> None:
        key = (tdef,) + selector
        self._invalidate_key(key)
        self._container_registry[key] = value

    def unregister(
        self,
        tdef: Hashable,
        *,
        selector: Tuple[Hashable, ...] = (),
    ) -> None:
        key = (tdef,) + selector
        self._invalidate_key(key)
        self._container_registry.pop(key)

    @classmethod
    def provide(cls) -> Argument:
        return Argument(cls)

    @classmethod
    def _from_container(
        cls,
        key: Tuple[Hashable, ...],
        invalidate: Callable[[], None],
    ) -> Any:
        instance = cls._instance
        if instance is None:
            raise ContainerNotWiredError

        value = instance._container_registry[key]
        instance._container_invalidate[key].append(invalidate)

        return value

    def _invalidate_key(self, key):
        cbs = self._container_invalidate[key]
        for cb in cbs:
            cb()
        cbs[:] = []


@dataclass(frozen=True)
class Argument:
    cnt: Type[Container]
    selector: KeyType = ()

    def bind(self, name: str, tdef: Hashable) -> BoundArgument:
        return BoundArgument(self.cnt, name, (tdef,) + self.selector)


@dataclass(frozen=True)
class BoundArgument:
    cnt: Type[Container]
    name: str
    key: KeyType

    def __repr__(self) -> str:
        trepr = formatannotationrelativeto(self.key[0])(self.key[0])
        return f"{self.name}: {trepr}"


class ContainerNotWiredError(Exception):
    pass


class ContainerWiredError(Exception):
    def __init__(self, cls: TContainer, new: Container) -> None:
        super().__init__(
            f"{cls!r} is already wired to {cls._instance!r} " f"but trying to wire to {new!r}"
        )
