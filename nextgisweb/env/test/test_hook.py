import pytest

from nextgisweb.env.hook import ComponentHook


@pytest.mark.usefixtures("ngw_env")
def test_example():
    test_hook = ComponentHook("test_hook")

    @test_hook(cid="core")
    def foo(comp):
        pass

    @test_hook(before=[foo], cid="core")
    def bar(comp):
        pass

    assert list(func for _, func in test_hook) == [bar, foo]


@pytest.mark.usefixtures("ngw_env")
def test_stages():
    test_hook = ComponentHook("test_hook")

    @test_hook(stage="final", cid="core")
    def final(comp):
        pass

    @test_hook(stage="initial", cid="core")
    def initial(comp):
        pass

    @test_hook(cid="core")
    def default(comp):
        pass

    assert list(func for _, func in test_hook) == [initial, default, final]
