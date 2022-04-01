from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID
from collections import OrderedDict

import pytest

from nextgisweb.lib.json import dumpb, loadb, dumps, loads


int64min = -9223372036854775808
int64max = 9223372036854775807
v_uuid = UUID('fa50a8f4-b3d7-4073-b643-6610c535e668')
v_date = date(2011, 1, 1)
v_time = time(20, 30, 15)
v_datetime = datetime(2011, 1, 1, 20, 30, 15)


@pytest.mark.parametrize('data, serialized, deserialized', (
    pytest.param(int64max, str(int64max), int64max, id='int64max'),
    pytest.param(int64min, str(int64min), int64min, id='int64min'),
    pytest.param(Decimal('3.1415'), '"3.1415"', '3.1415', id='decimal'),
    pytest.param(
        v_date, f'"{v_date.isoformat()}"',
        v_date.isoformat(), id='date'),
    pytest.param(
        v_time, f'"{v_time.isoformat()}"',
        v_time.isoformat(), id='time'),
    pytest.param(
        v_datetime, f'"{v_datetime.isoformat()}"',
        v_datetime.isoformat(), id='datetime'),
    pytest.param(v_uuid, f'"{v_uuid}"', str(v_uuid), id='uuid'),
    pytest.param(
        [OrderedDict(a=0), dict(b=1)], '[{"a":0},{"b":1}]',
        [dict(a=0), dict(b=1)], id='complex')
))
def test_json(data, serialized, deserialized):
    result_dumpb = dumpb(data)
    assert result_dumpb == serialized.encode('utf-8')
    assert loadb(result_dumpb) == deserialized

    result_dumps = dumps(data)
    assert result_dumps == serialized
    assert loads(result_dumps) == deserialized


def test_json_pretty():
    assert dumps(dict(a=1, b=2)) == '{"a":1,"b":2}'
    assert dumps(dict(a=1, b=2), pretty=True) == '{\n  "a": 1,\n  "b": 2\n}'
