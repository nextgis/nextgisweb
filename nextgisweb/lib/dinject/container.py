from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable, Hashable
from typing import Any, Self

type KeyType = tuple[Hashable, ...]


class Container:
    _instance: Container | None = None
    _container_registry: dict[KeyType, Any]
    _container_invalidate: dict[KeyType, list[Callable[[], None]]]

    def __init__(self) -> None:
        self._container_registry = dict()
        self._container_invalidate = defaultdict(list)

    def wire(self) -> Self:
        cls = self.__class__
        if cls._instance is not None:
            raise ContainerWiredError(cls, self)
        cls._instance = self

        return self

    def unwire(self) -> Self:
        if self.__class__._instance is None:
            raise ContainerNotWiredError

        for cbs in self._container_invalidate.values():
            for cb in cbs:
                cb()
            cbs[:] = []

        self.__class__._instance = None

        return self

    def register[T](self, tdef: type[T], value: T, /, selector: KeyType = ()) -> None:
        key = (tdef,) + selector
        self._invalidate_key(key)
        self._container_registry[key] = value

    def unregister[T](self, tdef: type[T], /, *, selector: KeyType = ()) -> None:
        key = (tdef,) + selector
        self._invalidate_key(key)
        self._container_registry.pop(key)

    @classmethod
    def _from_container(cls, key: KeyType, invalidate: Callable[[], None]) -> Any:
        instance = cls._instance
        if instance is None:
            raise ContainerNotWiredError

        value = instance._container_registry[key]
        instance._container_invalidate[key].append(invalidate)

        return value

    def _invalidate_key(self, key: KeyType) -> None:
        cbs = self._container_invalidate[key]
        for cb in cbs:
            cb()
        cbs[:] = []


class ContainerNotWiredError(Exception):
    pass


class ContainerWiredError(Exception):
    def __init__(self, cls: type[Container], new: object) -> None:
        super().__init__(
            f"{cls!r} is already wired to {cls._instance!r} but trying to wire to {new!r}"
        )
