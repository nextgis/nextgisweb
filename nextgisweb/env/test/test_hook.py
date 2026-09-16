import pytest

from nextgisweb.env.hook import ComponentHook


@pytest.mark.usefixtures("ngw_env")
def test_example():
    test_hook = ComponentHook("test_hook")

    @test_hook(cident="core")
    def foo(comp):
        pass

    @test_hook(before=[foo], cident="core")
    def bar(comp):
        pass

    assert list(func for _, func in test_hook) == [bar, foo]


@pytest.mark.usefixtures("ngw_env")
def test_stages():
    test_hook = ComponentHook("test_hook")

    @test_hook(stage="final", cident="core")
    def final(comp):
        pass

    @test_hook(stage="initial", cident="core")
    def initial(comp):
        pass

    @test_hook(cident="core")
    def default(comp):
        pass

    assert list(func for _, func in test_hook) == [initial, default, final]
