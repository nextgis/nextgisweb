from typing import Any, Callable, Iterable, cast, overload

from msgspec import Struct

from nextgisweb.lib.i18n import TranslatableOrStr

DynMenuFactory = Callable[[Any], Iterable["Item"]]


class DynMenu:
    def __init__(self, *args: "Item" | DynMenuFactory):
        self._items = list(args)
        self._filters = list()

    @overload
    def add(self, *items: "Item"): ...

    @overload
    def add(self, item: DynMenuFactory, /): ...

    def add(self, *items):
        self._items.extend(items)

    def add_filter(self, func):
        self._filters.append(func)

    def build(self, args):
        result: list[Item] = list()
        for item in self._items:
            if callable(item):
                result.extend(item(args))
            else:
                result.append(item.copy())

        # Move operaions back
        result.sort(key=lambda item: item.key if item.key[0] == "operation" else ("_",) + item.key)

        for func in self._filters:
            func(result)

        return result

    def json(self, args):
        result: list[Item.JSON] = []
        label = None
        for item in self.build(args):
            if isinstance(item, Label):
                label = item
            else:
                if label is not None:
                    result.append(label.json(args))
                    label = None
                result.append(item.json(args))
        return result


class Item:
    def __init__(self, key: str | tuple[str, ...]):
        if isinstance(key, str):
            _key = tuple(key.split("/"))
        elif key is None:
            _key = cast(tuple[str, ...], ())
        else:
            _key = key
        self.key = _key

    def copy(self):
        return Item(self.key)

    @property
    def level(self):
        return len(self.key) - 1

    class JSON(Struct, kw_only=True):
        key: list[str]

    def json(self, args) -> JSON:
        raise NotImplementedError


class Label(Item):
    def __init__(self, key: str | tuple[str, ...], label: TranslatableOrStr):
        super().__init__(key)
        self.label = label

    def copy(self):
        return Label(self.key, label=self.label)

    class JSON(Item.JSON, tag="label", kw_only=True):
        label: str

    def json(self, args) -> JSON:
        translate = args.request.translate
        return Label.JSON(
            key=list(self.key),
            label=translate(self.label),
        )


class Link(Item):
    def __init__(
        self,
        key: str | tuple[str, ...],
        label: TranslatableOrStr,
        url: Callable[[Any], str],
        *,
        important: bool = False,
        target: str = "_self",
        icon: str | None = None,
        icon_suffix: str | None = None,
    ):
        super().__init__(key)
        self.label = label
        self.url = url
        self.important = important
        self.target = target
        self.icon = icon
        self.icon_suffix = icon_suffix

    def copy(self):
        return Link(
            self.key,
            label=self.label,
            url=self.url,
            important=self.important,
            target=self.target,
            icon=self.icon,
            icon_suffix=self.icon_suffix,
        )

    class JSON(Item.JSON, tag="link", kw_only=True):
        label: str
        url: str
        target: str
        icon: str | None
        icon_suffix: str | None
        selected: bool

    def json(self, args) -> JSON:
        translate = args.request.translate
        url = self.url(args)
        return Link.JSON(
            key=list(self.key),
            label=translate(self.label),
            url=url,
            target=self.target,
            icon=self.icon,
            icon_suffix=self.icon_suffix,
            selected=url == args.request.url,
        )
