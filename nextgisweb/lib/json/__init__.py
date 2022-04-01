import orjson
from decimal import Decimal


__all__ = ['dumpb', 'loadb', 'dumps', 'loads']


def default(obj):
    if isinstance(obj, Decimal):
        return str(obj)
    raise TypeError


def dumpb(data, pretty=False, **kw):
    if 'default' in kw:
        del kw['default']

    option = 0
    if pretty:
        option |= orjson.OPT_INDENT_2

    return orjson.dumps(data, option=option, default=default, **kw)


def dumps(data, *a, **kw):
    return dumpb(data, *a, **kw).decode('utf-8')


loadb = loads = orjson.loads
