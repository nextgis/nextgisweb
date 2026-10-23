import sys
from typing import Any

import msgspec.json

if "pytest" in sys.modules:
    from freezegun.api import FakeDate, FakeDatetime

    _pytest_freezegun = True
else:
    _pytest_freezegun = False

__all__ = [
    "dumpb",
    "dumps",
    "loadb",
    "loads",
]


def _enc_hook(obj: Any) -> str:
    if _pytest_freezegun and isinstance(obj, (FakeDatetime, FakeDate)):
        return obj.isoformat()
    if isinstance(obj, str):
        return str(obj)
    raise NotImplementedError(type(obj))


_encoder = msgspec.json.Encoder(enc_hook=_enc_hook)
_decoder = msgspec.json.Decoder()


def dumpb(data: Any, pretty: bool = False) -> bytes:
    result = _encoder.encode(data)
    if pretty:
        return msgspec.json.format(result)
    return result


def dumps(data: Any, pretty: bool = False) -> str:
    return dumpb(data, pretty=pretty).decode("utf-8")


loadb = loads = _decoder.decode
