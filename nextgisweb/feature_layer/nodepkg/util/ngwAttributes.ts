import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import type { FeatureLayerFieldDatatype } from "@nextgisweb/feature-layer/type/api";
import { assert } from "@nextgisweb/jsrealm/error";

import type { NgwAttributeType } from "../type/FeatureItem";

const DATETIME_TYPES: readonly FeatureLayerFieldDatatype[] = [
    "DATE",
    "TIME",
    "DATETIME",
];

export function isDateTimeFieldType(datatype: FeatureLayerFieldDatatype) {
    return DATETIME_TYPES.includes(datatype);
}

const parseDate = (value: string | number) => {
    let dayjsValue = dayjs(value);

    if (typeof value !== "string") {
        return dayjsValue;
    }

    // This is a common way to start a date string (e.g., "YYYY-MM-DD").
    const regex = /^(\d{4})-/;
    const match = value.match(regex);
    if (match) {
        const year = parseInt(match[1], 10);
        if (year < 100) {
            // To prevent misinterpretation and ensure the year is set EXACTLY as provided
            // (e.g., year 50 should be the year 50 AD, not 1950 or 2050),
            // we explicitly set the year component of the dayjs object.
            dayjsValue = dayjsValue.year(year);
        }
    }

    return dayjsValue;
};

export function unmarshalFieldValue(
    datatype: FeatureLayerFieldDatatype,
    value: NgwAttributeType
): null | number | string | Dayjs {
    if (value === null) {
        return value;
    } else if (isDateTimeFieldType(datatype)) {
        assert(typeof value === "string");
        if (datatype !== "TIME") {
            return parseDate(value);
        } else {
            return dayjs(`1970-00-00T${value}`);
        }
    }
    return value;
}

export function marshalFieldValue(
    datatype: FeatureLayerFieldDatatype,
    value: unknown
): NgwAttributeType {
    if (value === null) {
        return null;
    } else if (isDateTimeFieldType(datatype)) {
        const dayjsValue = dayjs.isDayjs(value)
            ? value
            : parseDate(value as string);
        if (datatype === "DATE") {
            return dayjsValue.format("YYYY-MM-DD");
        } else if (datatype === "TIME") {
            return dayjsValue.format("HH:mm:ss");
        } else if (datatype === "DATETIME") {
            return dayjsValue.format("YYYY-MM-DDTHH:mm:ss");
        }
    }
    return value as NgwAttributeType;
}
