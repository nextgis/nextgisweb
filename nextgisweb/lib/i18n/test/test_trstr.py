from contextlib import contextmanager
from logging import ERROR

import pytest

from ..trstr import Translator, trstr_factory

f = trstr_factory("test")
n = f.ngettext
p = f.pgettext
np = f.npgettext


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
    assert uc_tr(f("foo")) == "FOO"
    assert uc_tr(p("ctx", "bar")) == "BAR@CTX"


def test_plural(uc_tr):
    assert uc_tr(n("one", "many", 1)) == "ONE"
    assert uc_tr(n("one", "many", 2)) == "MANY"
    assert uc_tr(np("ctx", "one", "many", 1)) == "ONE@CTX"
    assert uc_tr(np("ctx", "one", "many", 2)) == "MANY@CTX"


def test_concat(uc_tr):
    assert uc_tr(f("foo") + " " + f("bar")) == "FOO BAR"
    assert uc_tr(f("foo") + (" " + f("bar"))) == "FOO BAR"

    value = f("foo")
    value += " " + f("bar")
    assert uc_tr(value) == "FOO BAR"
    assert len(value.items) == 3


def test_format(uc_tr):
    assert uc_tr(f("foo %s") % f("bar")) == "FOO BAR"
    assert uc_tr(f("foo {}").format(f("bar"))) == "FOO BAR"
    assert uc_tr(f("foo %s") % f("bar") + " " + f("foo")) == "FOO BAR FOO"


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
    assert tr(f("A").format() + " " + f("A")) == "B B"

    dt.add("M%s", "T%d")
    with assert_exception():
        assert tr(f("M%s") % "a") == "Ma"

    dt.add("M{}", "T{}")
    dt.add("M%d", "T%d")
    assert tr(f("M{}").format("a")) == "Ta"
    assert tr(f("M{}").format("a") + f("M%d") % 1) == "TaT1"
    with pytest.raises(TypeError):
        tr(f("M{}").format("a") + f("M%d") % "a")

    dt.add("M{}", "T{}{}")
    with assert_exception():
        assert tr(f("M{}").format("a")) == "Ma"

    dt.add("M{p}", "T{q}")
    with assert_exception():
        assert tr(f("M{p}").format(p="a")) == "Ma"

    dt.add("M{q}", "T")
    assert tr(f("M{q}").format(q="a")) == "T"
