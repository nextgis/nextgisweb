from zope.interface import Interface

interface_registry = list()


class IResourceBaseMeta(type(Interface)):  # ty: ignore[unsupported-base]
    def __init__(self, name, bases, attrs, __doc__=None, __module__=None):
        super().__init__(name, bases, attrs, __doc__, __module__)
        if name != "IResourceBase":
            interface_registry.append(self)


class IResourceBase(Interface, metaclass=IResourceBaseMeta):  # ty: ignore[unsupported-base]
    pass


class IResourceAdapter(Interface):  # ty: ignore[unsupported-base]
    pass
