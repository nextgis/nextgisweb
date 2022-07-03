from babel.core import parse_locale as babel_parse_locale, get_locale_identifier


def parse_locale(ident):
    return babel_parse_locale(ident, '_' if '_' in ident else '-')


def to_gettext_locale(ident):
    tup = list(parse_locale(ident))
    if tup[1] is not None:
        tup[1] = tup[1].upper()
    return get_locale_identifier(tup, sep='_')


def to_http_locale(ident):
    tup = list(parse_locale(ident))
    if tup[1] is not None:
        tup[1] = tup[1].lower()
    return get_locale_identifier(tup, sep='-')
