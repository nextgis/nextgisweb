import dayjs from "dayjs";

import type {
    NgwAttributeType,
    NgwDate,
    NgwDateTime,
    NgwTime,
} from "../type/FeatureItem";
import type { FeatureLayerDataType } from "../type/FeatureLayer";

export function isDateType(datatype: FeatureLayerDataType) {
    return ["DATE", "TIME", "DATETIME"].includes(datatype);
}

export function parseNgwAttribute(
    datatype: FeatureLayerDataType,
    value: NgwAttributeType
) {
    if (value !== null && isDateType(datatype)) {
        let dt;
        if (typeof value === "object") {
            if (datatype === "DATE") {
                const { year, month, day } = value as NgwDate;
                dt = new Date(year, month - 1, day);
            } else if (datatype === "TIME") {
                const { hour, minute, second } = value as NgwTime;
                dt = new Date(0, 0, 0, hour, minute, second);
            } else if (datatype === "DATETIME") {
                const { year, month, day, hour, minute, second } =
                    value as NgwDateTime;
                dt = new Date(year, month - 1, day, hour, minute, second);
            }
        } else if (typeof value === "string") {
            if (datatype !== "TIME") {
                dt = value;
            } else {
                dt = `1970-00-00T${value}`;
            }
        }
        return dayjs(dt);
    }
    return value;
}

export function formatNgwAttribute(
    datatype: FeatureLayerDataType,
    value: unknown,
    opt: { isoDate?: boolean } = {}
): NgwAttributeType {
    if (value === null) {
        return null;
    }
    if (isDateType(datatype)) {
        const v = dayjs(value as string);
        const isoDate = opt.isoDate ?? true;
        if (isoDate) {
            if (datatype === "DATE") {
                return dayjs(v).format("YYYY-MM-DD");
            } else if (datatype === "TIME") {
                return dayjs(v).format("HH:mm:ss");
            } else if (datatype === "DATETIME") {
                return dayjs(v).format("YYYY-MM-DDTHH:mm:ss");
            }
        } else {
            if (datatype === "DATE") {
                return {
                    year: v.get("year"),
                    month: v.get("month") + 1,
                    day: v.get("day"),
                };
            } else if (datatype === "TIME") {
                return {
                    hour: v.get("hour"),
                    minute: v.get("minute"),
                    second: v.get("second"),
                };
            } else if (datatype === "DATETIME") {
                return {
                    year: v.get("year"),
                    month: v.get("month") + 1,
                    day: v.get("day"),
                    hour: v.get("hour"),
                    minute: v.get("minute"),
                    second: v.get("second"),
                };
            }
        }
    }
    return value as NgwAttributeType;
}
