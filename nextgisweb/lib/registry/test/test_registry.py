from __future__ import annotations

from typing import ClassVar

from ..registry import ListRegistry, list_registry


def test_super_init_subclass():

    @list_registry
    class Base:
        registry: ClassVar[ListRegistry[type[Base]]]

        _base = False

        def __init_subclass__(cls):
            super().__init_subclass__()
            assert cls is not Base and issubclass(cls, Base)
            cls._base = True

    class MixinPre:
        _mixin_pre = False

        def __init_subclass__(cls):
            super().__init_subclass__()
            cls._mixin_pre = True

    class MixinPost:
        _mixin_post = False

        def __init_subclass__(cls):
            super().__init_subclass__()
            cls._mixin_post = True

    class Sub(MixinPre, Base, MixinPost):
        _sub = False

        def __init_subclass__(cls):
            super().__init_subclass__()
            cls._sub = True

    assert Sub in Base.registry
    assert Sub.__dict__.get("_base") is True
    assert Sub.__dict__.get("_sub") is False
    assert Sub.__dict__.get("_mixin_pre") is True
    assert Sub.__dict__.get("_mixin_post") is True

    class Grand(Sub):
        pass

    assert Grand in Base.registry
    assert Grand.__dict__.get("_base") is True
    assert Grand.__dict__.get("_sub") is True
    assert Grand.__dict__.get("_mixin_pre") is True
    assert Grand.__dict__.get("_mixin_post") is True
