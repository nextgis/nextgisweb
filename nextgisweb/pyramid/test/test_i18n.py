from nextgisweb.env import npgettext


def test_npgettext(ngw_env):
    en = ngw_env.core.localizer("en").translate
    ru = ngw_env.core.localizer("ru").translate

    n = lambda n: npgettext("test", "unit", "units", n)

    assert (en(n(1)), en(n(2)), en(n(5))) == ("unit", "units", "units")
    assert (ru(n(1)), ru(n(2)), ru(n(5))) == ("штука", "штуки", "штук")
