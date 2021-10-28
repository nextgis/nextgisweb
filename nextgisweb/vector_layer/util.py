from ..i18n import trstring_factory

COMP_ID = 'vector_layer'
_ = trstring_factory(COMP_ID)


def test_encoding(s):
    try:
        s.encode('utf-8')
    except UnicodeEncodeError:
        return False
    else:
        return True


def fix_encoding(s):
    while not test_encoding(s):
        s = s[:-1]
    return s


def utf8len(s):
    return len(s.encode('utf-8'))
