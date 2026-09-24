from babel.core import get_locale_identifier
from babel.core import parse_locale as babel_parse_locale
from babel.messages.pofile import write_po as babel_write_po


def write_po(path, catalog, ignore_obsolete=False):
    path.touch(exist_ok=True)

    with open(path, "+rb") as fd:
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


def parse_locale(ident: str) -> tuple[str, str | None]:
    sep = "_" if "_" in ident else "-"
    parsed = babel_parse_locale(ident, sep)
    return tuple(parsed[:2])


def to_gettext_locale(ident: str) -> str:
    a, b = parse_locale(ident)
    if b is not None:
        b = b.upper()
    return get_locale_identifier((a, b), sep="_")


def to_http_locale(ident: str) -> str:
    a, b = parse_locale(ident)
    if b is not None:
        b = b.upper()
    return get_locale_identifier((a, b), sep="-")
