import sys
import orjson
from decimal import Decimal

__all__ = ['dumpb', 'loadb', 'dumps', 'loads']


if 'pytest' in sys.modules:
    from freezegun.api import FakeDatetime, FakeDate
    _pytest_freezegun = True
else:
    _pytest_freezegun = False


def default(obj):
    if isinstance(obj, Decimal):
        return str(obj)
    elif _pytest_freezegun and isinstance(obj, (FakeDatetime, FakeDate)):
        return obj.isoformat()
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
