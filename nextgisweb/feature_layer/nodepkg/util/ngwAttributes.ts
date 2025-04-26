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

export function unmarshalFieldValue(
    datatype: FeatureLayerFieldDatatype,
    value: NgwAttributeType
): null | number | string | Dayjs {
    if (value === null) {
        return value;
    } else if (isDateTimeFieldType(datatype)) {
        assert(typeof value === "string");
        if (datatype !== "TIME") {
            return dayjs(value);
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
        const v = dayjs(value as string);
        if (datatype === "DATE") {
            return dayjs(v).format("YYYY-MM-DD");
        } else if (datatype === "TIME") {
            return dayjs(v).format("HH:mm:ss");
        } else if (datatype === "DATETIME") {
            return dayjs(v).format("YYYY-MM-DDTHH:mm:ss");
        }
    }
    return value as NgwAttributeType;
}
