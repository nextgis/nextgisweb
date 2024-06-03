from datetime import date, datetime, time

from .interface import FIELD_TYPE

DT_DATATYPES = (FIELD_TYPE.DATE, FIELD_TYPE.TIME, FIELD_TYPE.DATETIME)


def _date_from_legacy(val):
    return date(int(val["year"]), int(val["month"]), int(val["day"]))


def _date_to_legacy(val):
    return dict(year=val.year, month=val.month, day=val.day)


def _time_from_legacy(val):
    return time(int(val["hour"]), int(val["minute"]), int(val["second"]))


def _time_to_legacy(val):
    return dict(hour=val.hour, minute=val.minute, second=val.second)


def _datetime_from_legacy(val):
    return datetime(
        int(val["year"]),
        int(val["month"]),
        int(val["day"]),
        int(val["hour"]),
        int(val["minute"]),
        int(val["second"]),
    )


def _datetime_to_legacy(val):
    return dict(
        year=val.year,
        month=val.month,
        day=val.day,
        hour=val.hour,
        minute=val.minute,
        second=val.second,
    )


DT_LOADERS = dict(
    iso={
        FIELD_TYPE.DATE: date.fromisoformat,
        FIELD_TYPE.TIME: time.fromisoformat,
        FIELD_TYPE.DATETIME: datetime.fromisoformat,
    },
    obj={
        FIELD_TYPE.DATE: _date_from_legacy,
        FIELD_TYPE.TIME: _time_from_legacy,
        FIELD_TYPE.DATETIME: _datetime_from_legacy,
    },
)


DT_DUMPERS = dict(
    iso={
        FIELD_TYPE.DATE: lambda val: val.isoformat(),
        FIELD_TYPE.TIME: lambda val: val.isoformat(),
        FIELD_TYPE.DATETIME: lambda val: val.isoformat(),
    },
    obj={
        FIELD_TYPE.DATE: _date_to_legacy,
        FIELD_TYPE.TIME: _time_to_legacy,
        FIELD_TYPE.DATETIME: _datetime_to_legacy,
    },
)
