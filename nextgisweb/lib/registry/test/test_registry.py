from .. import list_registry


def test_super_init_subclass():
    @list_registry
    class Base:
        __marker = False

        def __init_subclass__(cls):
            assert cls is not Base
            assert issubclass(cls, Base)
            cls.__marker = True

    class Sub(Base):
        __marker = False

        def __init_subclass__(cls):
            cls.__marker = True
            super().__init_subclass__()

    class Grand(Sub):
        pass

    assert Sub in Base.registry
    assert Sub._Base__marker is True

    assert Grand in Base.registry
    assert Grand._Sub__marker is True
