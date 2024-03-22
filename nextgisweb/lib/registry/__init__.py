from warnings import warn


class ListRegistry:
    def __init__(self):
        self._items = list()

    def register(self, cls):
        if cls in self._items:
            warn(f"{cls} was already registered in the registry", stacklevel=2)
            return cls
        else:
            self._items.append(cls)
        return cls

    def __iter__(self):
        return self._items.__iter__()


class DictRegistry:
    def __init__(self):
        self._dict = dict()

    def register(self, member):
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

    def __iter__(self):
        warn(
            "Don't use the registry default iterator, use items() or keys() or values() instead",
            stacklevel=2,
        )
        for i in self._dict.values():
            yield i

    def items(self):
        yield from self._dict.items()

    def keys(self):
        yield from self._dict.keys()

    def values(self):
        yield from self._dict.values()

    def __getitem__(self, identity):
        return self._dict[identity]

    def __contains__(self, identity):
        return self._dict.__contains__(identity)

    def __len__(self):
        return len(self._dict)

    def get(self, identity, default=None):
        return self._dict.get(identity, default)


class LegacyRegistry:
    def __init__(self):
        self._items = []
        self._dict = dict()

    def register(self, member):
        if member in self._items:
            warn(f"{member!r} was already registered in the registry", stacklevel=2)
            return member
        else:
            self._items.append(member)

        identity = getattr(member, "identity", None)

        if identity is None:
            pass
        elif existing := self._dict.get(identity):
            if existing is member:
                warn(f"{member!r} was already registered in the registry", stacklevel=2)
            else:
                raise TypeError(f"{existing!r} already registered with '{identity}' key")
        else:
            self._dict[identity] = member

        return member

    def __iter__(self):
        for i in self._items:
            yield i

    def __getitem__(self, identity):
        return self._dict[identity]

    def __contains__(self, identity):
        return self._dict.__contains__(identity)

    def __len__(self):
        return len(self._items)

    def get(self, identity, default=None):
        return self._dict.get(identity, default)


def registry_maker():
    warn("registry_maker() is deprecated since 4.4.0.dev9", DeprecationWarning, 2)
    return LegacyRegistry()


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
