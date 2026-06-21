from collections.abc import Generator, ItemsView, Iterable, Iterator, KeysView, Mapping, ValuesView
from typing import TYPE_CHECKING, TypeVar, overload
from warnings import warn


class ListRegistry[T](Iterable[T]):
    def __init__(self):
        self._items = list[T]()

    def register(self, cls: T) -> T:
        if cls in self._items:
            warn(f"{cls} was already registered in the registry", stacklevel=2)
            return cls
        else:
            self._items.append(cls)
        return cls

    def __iter__(self) -> Iterator[T]:
        return self._items.__iter__()


class DictRegistry[T](Mapping[str, T]):
    def __init__(self):
        self._dict = dict[str, T]()

    def register(self, member: T):
        identity = getattr(member, "identity", None)
        if identity is None or not isinstance(identity, str):
            raise TypeError(f"{member!r} must have 'identity' attribute")
        elif existing := self._dict.get(identity):
            if existing is member:
                warn(f"{member!r} was already registered in the registry", stacklevel=2)
            else:
                raise TypeError(f"{existing!r} already registered with '{identity}' key")
        else:
            self._dict[identity] = member

        return member

    def __iter__(self) -> Iterator[str]:
        return self._dict.__iter__()

    def items(self) -> ItemsView[str, T]:
        return self._dict.items()

    def keys(self) -> KeysView[str]:
        return self._dict.keys()

    def values(self) -> ValuesView[T]:
        return self._dict.values()

    def __getitem__(self, identity) -> T:
        return self._dict[identity]

    def __contains__(self, identity) -> bool:
        return self._dict.__contains__(identity)

    def __len__(self) -> int:
        return len(self._dict)

    if not TYPE_CHECKING:

        def get(self, identity, default=None, /):
            return self._dict.get(identity, default)


def _registry(cls, regcls):
    assert not hasattr(cls, "registry")
    cls.registry = regcls()

    original_init_subclass = cls.__init_subclass__

    def _patched_init_subclass(subcls, **kwargs):
        if func := getattr(original_init_subclass, "__func__", None):
            func(subcls, **kwargs)
        cls.registry.register(subcls)

    cls.__init_subclass__ = classmethod(_patched_init_subclass)

    return cls


def list_registry(cls):
    return _registry(cls, ListRegistry)


def dict_registry(cls):
    return _registry(cls, DictRegistry)
