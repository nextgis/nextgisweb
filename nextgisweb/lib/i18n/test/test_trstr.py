from ..trstr import trstr_factory


class UpperCaseTranslator:
    def translate(self, msg, *, context=None, domain=None):
        assert domain == 'test'
        return msg.upper().replace('%S', '%s')


dt = UpperCaseTranslator()
f = trstr_factory('test')


def do_tr(value):
    return value.__translate__(dt)


def test_concat():
    assert do_tr(f("foo") + " " + f("bar")) == "FOO BAR"
    assert do_tr(f("foo") + (" " + f("bar"))) == "FOO BAR"

    value = f("foo")
    value += " " + f("bar")
    assert do_tr(value) == "FOO BAR"
    assert len(value._items) == 3


def test_format():
    assert do_tr(f("foo %s") % f("bar")) == "FOO BAR"
    assert do_tr(f("foo {}").format(f("bar"))) == "FOO BAR"
    assert do_tr(f("foo %s") % f("bar") + " " + f("foo")) == "FOO BAR FOO"
