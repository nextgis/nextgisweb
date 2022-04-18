class DynMenu(object):

    def __init__(self, *args):
        self._items = list(args)
        self._filters = list()

    def add(self, *items):
        self._items.extend(items)

    def add_filter(self, func):
        self._filters.append(func)

    def build(self, args):
        result = list()

        for item in self._items:
            if isinstance(item, DynItem):
                result.extend(item.build(args))
            else:
                result.append(item.copy())

        # Move operaions back
        result.sort(key=lambda item: item.key
                    if item.key[0] == 'operation'
                    else ('_',) + item.key)

        for func in self._filters:
            func(result)

        return result


class Item(object):

    def __init__(self, key):
        self._key = tuple(key.split('/')) if isinstance(key, str) else (
            () if key is None else key)

    def copy(self):
        return Item(self.key)

    @property
    def key(self):
        return self._key

    @property
    def level(self):
        return len(self._key) - 1


class DynItem(Item):

    def __init__(self, key=None):
        super().__init__(key)

    def copy(self):
        raise NotImplementedError()

    def sub(self, value):
        if not self.key:
            return value
        else:
            if isinstance(value, str):
                value = tuple(value.split('/'))
            return self.key + value

    def build(self, args):
        pass


class Label(Item):

    def __init__(self, key, label):
        super().__init__(key)
        self._label = label

    def copy(self):
        return Label(self.key, self.label)

    @property
    def label(self):
        return self._label


class Link(Item):

    def __init__(self, key, label, url, icon=None, important=False, target='_self'):
        super().__init__(key)
        self._label = label
        self._url = url
        self._icon = icon
        self._important = important
        self._target = target

    def copy(self):
        return Link(
            self.key, self.label, self.url,
            icon=self.icon,
            important=self.important,
            target=self.target)

    @property
    def label(self):
        return self._label

    @property
    def url(self):
        return self._url

    @property
    def icon(self):
        return self._icon

    @property
    def important(self):
        return self._important

    @property
    def target(self):
        return self._target
