from collections.abc import ItemsView, Iterable, Iterator, KeysView, Mapping, ValuesView


class ListRegistry[T](Iterable[T]):
    def __init__(self) -> None:
        self._list: list[T] = []

    def register(self, member: T, /) -> T:
        if any(existing is member for existing in self._list):
            raise TypeError(f"{member!r} already registered in the registry")

        self._list.append(member)
        return member

    def __iter__(self) -> Iterator[T]:
        return self._list.__iter__()


class DictRegistry[T](Mapping[str, T]):
    def __init__(self) -> None:
        self._dict: dict[str, T] = {}

    def register(self, member: T, /) -> T:

        if any(existing is member for existing in self._dict.values()):
            raise TypeError(f"{member!r} is already registered in the registry")

        identity = getattr(member, "identity", None)
        if identity is None or not isinstance(identity, str):
            raise TypeError(f"{member!r} must have 'identity' attribute")
        if identity in self._dict:
            raise TypeError(f"'{identity}' key is already used in the registry")

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

    def __getitem__(self, key: str, /) -> T:
        return self._dict[key]

    def __contains__(self, key: object, /) -> bool:
        return self._dict.__contains__(key)

    def __len__(self) -> int:
        return len(self._dict)


def _registry[T](cls: T, regcls: type[ListRegistry[T]] | type[DictRegistry[T]]) -> T:
    assert not hasattr(cls, "registry")

    registry = regcls()
    setattr(cls, "registry", registry)

    original_init_subclass = cls.__dict__.get("__init_subclass__")

    def _patched_init_subclass(subcls, **kwargs) -> None:
        if original_init_subclass is None:
            # ty: ignore[invalid-super-argument]
            super(cls, subcls).__init_subclass__(**kwargs)
        else:
            original_init_subclass.__get__(None, subcls)(**kwargs)

        registry.register(subcls)

    setattr(cls, "__init_subclass__", classmethod(_patched_init_subclass))

    return cls


def list_registry[T](cls: T) -> T:
    return _registry(cls, ListRegistry[T])


def dict_registry[T](cls: T) -> T:
    return _registry(cls, DictRegistry[T])
