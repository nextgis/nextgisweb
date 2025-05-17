from contextlib import contextmanager
from logging import ERROR

import pytest

from ..trstr import Translator, trstr_factory

factory = trstr_factory("test")
_gettext = factory.gettext
_gettextf = factory.gettextf
_ngettext = factory.ngettext
_pgettext = factory.pgettext
_npgettext = factory.npgettext


class UpperCaseTranslator(Translator):
    def translate(
        self,
        msg,
        *,
        plural=None,
        number=None,
        context=None,
        domain,
    ):
        assert domain == "test"
        result = msg
        if number is not None:
            assert plural is not None
            if number > 1:
                result = plural
        result = result.upper().replace("%S", "%s")
        if context is not None:
            result += "@" + context.upper()
        return result


@pytest.fixture(scope="module")
def uc_tr():
    uct = UpperCaseTranslator()

    def tr(value):
        return value.__translate__(uct)

    return tr


def test_context(uc_tr):
    assert uc_tr(_gettext("foo")) == "FOO"
    assert uc_tr(_pgettext("ctx", "bar")) == "BAR@CTX"


def test_plural(uc_tr):
    assert uc_tr(_ngettext("one", "many", 1)) == "ONE"
    assert uc_tr(_ngettext("one", "many", 2)) == "MANY"
    assert uc_tr(_npgettext("ctx", "one", "many", 1)) == "ONE@CTX"
    assert uc_tr(_npgettext("ctx", "one", "many", 2)) == "MANY@CTX"


def test_concat(uc_tr):
    assert uc_tr(_gettext("foo") + " " + _gettext("bar")) == "FOO BAR"
    assert uc_tr(_gettext("foo") + (" " + _gettext("bar"))) == "FOO BAR"

    value = _gettext("foo")
    value += " " + _gettext("bar")
    assert uc_tr(value) == "FOO BAR"
    assert len(value.items) == 3


@pytest.mark.filterwarnings("ignore::DeprecationWarning")
@pytest.mark.parametrize(
    "c, m",
    [
        pytest.param(_gettext, True, id="legacy"),
        pytest.param(_gettextf, False, id="template"),
    ],
)
def test_format(c, m, uc_tr):
    assert uc_tr(c("foo {}").format(_gettext("bar"))) == "FOO BAR"
    if m:
        assert uc_tr(c("foo %s") % _gettext("bar")) == "FOO BAR"
        assert uc_tr(c("foo %s") % _gettext("bar") + " " + _gettext("foo")) == "FOO BAR FOO"


class DictTranslator(Translator):
    def __init__(self):
        self._dict = dict()

    def add(self, msg, translation):
        self._dict[msg] = translation

    def translate(
        self,
        msg,
        *,
        plural=None,
        number=None,
        context=None,
        domain,
    ):
        assert domain == "test"
        return self._dict[msg]


def test_guard(caplog):
    caplog.set_level(ERROR, logger="nextgisweb.lib.i18n.trstr")
    dt = DictTranslator()

    def tr(value):
        return value.__translate__(dt)

    @contextmanager
    def assert_exception():
        caplog.clear()
        with caplog.at_level(ERROR):
            yield
            assert "Unable to format" in caplog.text

    dt.add("A", "B")
    assert tr(_gettextf("A").format() + " " + _gettext("A")) == "B B"

    dt.add("M%s", "T%d")
    with assert_exception():
        assert tr(_gettext("M%s") % "a") == "Ma"

    dt.add("M{}", "T{}")
    dt.add("M%d", "T%d")
    assert tr(_gettextf("M{}").format("a")) == "Ta"
    assert tr(_gettextf("M{}").format("a") + _gettext("M%d") % 1) == "TaT1"
    with pytest.raises(TypeError):
        tr(_gettextf("M{}").format("a") + _gettext("M%d") % "a")

    dt.add("M{}", "T{}{}")
    with assert_exception():
        assert tr(_gettextf("M{}").format("a")) == "Ma"

    dt.add("M{p}", "T{q}")
    with assert_exception():
        assert tr(_gettextf("M{p}").format(p="a")) == "Ma"

    dt.add("M{q}", "T")
    assert tr(_gettextf("M{q}").format(q="a")) == "T"


@pytest.mark.parametrize(
    "value, expected",
    [
        pytest.param(_gettext("foo"), "foo", id="gettext"),
        pytest.param(_gettextf("foo {}"), "foo {}", id="gettextf"),
        pytest.param(_ngettext("foo", "bar", 1), "foo", id="ngettext-singular"),
        pytest.param(_ngettext("foo", "bar", 2), "bar", id="ngettext-plural"),
        pytest.param(_pgettext("qux", "foo"), "foo", id="npgettext"),
        pytest.param(_npgettext("qux", "foo", "bar", 1), "foo", id="pgettext-singular"),
        pytest.param(_npgettext("qux", "foo", "bar", 2), "bar", id="pgettext-plural"),
        # Formatting
        pytest.param(_gettextf("foo {}").format("bar"), "foo bar", id="gettextf-format"),
        pytest.param(_gettextf("foo {}").format("bar"), "foo bar", id="gettextf-format"),
    ],
)
def test_str(value, expected):
    assert str(value) == expected
