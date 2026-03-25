import sys

import msgspec.json

if "pytest" in sys.modules:
    from freezegun.api import FakeDate, FakeDatetime

    _pytest_freezegun = True
else:
    _pytest_freezegun = False


def _enc_hook(obj):
    if _pytest_freezegun and isinstance(obj, (FakeDatetime, FakeDate)):
        return obj.isoformat()
    if isinstance(obj, str):
        return str(obj)
    raise NotImplementedError(type(obj))


_encoder = msgspec.json.Encoder(enc_hook=_enc_hook)
_decoder = msgspec.json.Decoder()


def dumpb(data, pretty=False):
    result = _encoder.encode(data)
    if pretty:
        return msgspec.json.format(result)
    return result


def dumps(data, pretty=False):
    return dumpb(data, pretty=pretty).decode("utf-8")


loadb = loads = _decoder.decode
