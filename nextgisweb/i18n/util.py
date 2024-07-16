import io

from babel.core import get_locale_identifier
from babel.core import parse_locale as babel_parse_locale
from babel.messages.pofile import write_po as babel_write_po


def write_po(path, catalog, ignore_obsolete=False):
    with io.open(path, "+rb") as fd:
        fd.truncate()

        babel_write_po(
            fd,
            catalog,
            width=80,
            omit_header=True,
            ignore_obsolete=ignore_obsolete,
        )

        # Fix trailing newlines: replace two newlines with one
        if fd.tell() >= 2:
            fd.seek(-2, 2)
            if fd.read(2) == b"\n\n":
                fd.seek(-1, 2)
                fd.truncate()


def parse_locale(ident):
    return babel_parse_locale(ident, "_" if "_" in ident else "-")


def to_gettext_locale(ident):
    tup = list(parse_locale(ident))
    if tup[1] is not None:
        tup[1] = tup[1].upper()
    return get_locale_identifier(tup, sep="_")


def to_http_locale(ident):
    tup = list(parse_locale(ident))
    if tup[1] is not None:
        tup[1] = tup[1].lower()
    return get_locale_identifier(tup, sep="-")
