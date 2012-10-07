def registry_maker():
    class ClassRegistry(object):

        def __init__(self):
            self._items = []
            self._dict = dict()

        def register(self, cls):
            self._items.append(cls)
            if hasattr(cls, 'identity'):
                self._dict[cls.identity] = cls

            return cls

        def __iter__(self):
            for i in self._items:
                yield i

        def __getitem__(self, identity):
            return self._dict[identity]

    return ClassRegistry()
