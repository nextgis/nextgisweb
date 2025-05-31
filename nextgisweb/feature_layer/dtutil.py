from datetime import date, datetime, time
from typing import Annotated, Any, Callable, ClassVar, Literal, Type, TypedDict

from msgspec import Meta, Struct, convert, to_builtins
from msgspec import ValidationError as MsgspecValidationError

from nextgisweb.env import gettext, gettextf
from nextgisweb.lib.json import dumps as json_dumps

from nextgisweb.core.exception import ValidationError

from .interface import FIELD_TYPE

DtFormat = Literal["obj", "iso"]


class DtConverterDict(TypedDict):
    obj: dict[str, Callable]
    iso: dict[str, Callable]


DT_DATATYPES: list[str] = []
DT_LOADERS: DtConverterDict = DtConverterDict(obj=dict(), iso=dict())
DT_DUMPERS: DtConverterDict = DtConverterDict(obj=dict(), iso=dict())


class LegacyFormatDateTimeValidationError(ValidationError):
    message_ = gettextf("Got an invalid date-time value in the legacy format: {}.")
    detail = gettext("Please use dt_format=iso and ISO-8601 based format.")

    def __init__(self, value: Any):
        value_json = json_dumps(value)
        super().__init__(self.message_.format(value_json))


class IsoFormatDateTimeValidationError(ValidationError):
    message_ = gettextf("Got an invalid date-time value in ISO-8601 format: {}.")
    detail_ = gettextf("Value should be in RFC 3339 {} format without timezone and leap seconds.")

    def __init__(self, value: Any, iso_format: str):
        value_json = json_dumps(value)
        super().__init__(
            message=self.message_.format(value_json),
            detail=self.detail_.format(iso_format),
        )


class Converter(Struct, kw_only=True, forbid_unknown_fields=True):
    datatype: ClassVar[str]
    native: ClassVar[Type]
    iso_format: ClassVar[str]
    legacy_attrs: ClassVar[tuple[str, ...]]

    def __init_subclass__(cls, *args, **kwargs):
        super().__init_subclass__(*args, **kwargs)
        DT_DATATYPES.append(cls.datatype)
        DT_LOADERS["obj"][cls.datatype] = cls.from_legacy
        DT_LOADERS["iso"][cls.datatype] = cls.from_iso
        DT_DUMPERS["obj"][cls.datatype] = cls.to_legacy
        DT_DUMPERS["iso"][cls.datatype] = cls.to_iso

    @classmethod
    def from_legacy(cls, value: Any) -> Any:
        try:
            obj = convert(value, cls)
        except MsgspecValidationError as exc:
            raise LegacyFormatDateTimeValidationError(value) from exc

        try:
            return cls.native(**to_builtins(obj))
        except ValueError as exc:
            raise LegacyFormatDateTimeValidationError(value) from exc

    @classmethod
    def from_iso(cls, value: Any) -> Any:
        try:
            return convert(value, cls.native)
        except MsgspecValidationError as exc:
            raise IsoFormatDateTimeValidationError(value, cls.iso_format) from exc

    @classmethod
    def to_legacy(cls, value: Any) -> dict:
        return {a: getattr(value, a) for a in cls.__struct_fields__}

    @classmethod
    def to_iso(cls, value: Any) -> str:
        return value.isoformat()


Year = Annotated[int, Meta(ge=0, le=9999)]
Month = Annotated[int, Meta(ge=1, le=12)]
Day = Annotated[int, Meta(ge=1, le=31)]
Hour = Annotated[int, Meta(ge=0, le=24)]
Minute = Annotated[int, Meta(ge=0, le=59)]
Second = Annotated[int, Meta(ge=0, le=59)]


class DateConverter(Converter):
    datatype = FIELD_TYPE.DATE
    native = date
    iso_format = "YYYY-MM-DD"

    year: Year
    month: Month
    day: Day


class TimeConverter(Converter):
    datatype = FIELD_TYPE.TIME
    native = Annotated[time, Meta(tz=False)]  # type: ignore
    iso_format = "HH:MM:SS"

    hour: Hour
    minute: Minute
    second: Second


class DateTimeConverter(Converter):
    datatype = FIELD_TYPE.DATETIME
    native = Annotated[datetime, Meta(tz=False)]  # type: ignore
    iso_format = DateConverter.iso_format + "T" + TimeConverter.iso_format

    year: Year
    month: Month
    day: Day
    hour: Hour
    minute: Minute
    second: Second
