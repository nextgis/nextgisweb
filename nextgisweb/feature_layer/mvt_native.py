from datetime import date, datetime, time

from nextgisweb.lib.json import dumps

from .interface import FIELD_TYPE


def mvt_value(value):
    match value:
        case None | bool() | int() | float() | str():
            return value
        case datetime() | time():
            return value.isoformat(timespec="seconds")
        case date():
            return value.isoformat()
        case _:
            raise TypeError(f"Unsupported value type: {type(value).__name__}")


def mvt_features(layer, features):
    json_fields = {f.keyname for f in layer.fields if f.datatype == FIELD_TYPE.JSON}
    for f in features:
        if f.geom is None:
            continue
        props = {
            k: (dumps(v) if v is not None else None) if k in json_fields else mvt_value(v)
            for k, v in f.fields.items()
        }
        yield (f.id, f.geom.wkb, props)
