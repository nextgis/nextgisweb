import dayjs from "dayjs";

export function isDateType(datatype) {
    return ["DATE", "TIME", "DATETIME"].includes(datatype);
}

export function parseNgwAttribute(datatype, value) {
    if (value !== null && isDateType(datatype)) {
        let dt;
        if (typeof value === "object") {
            if (datatype === "DATE") {
                dt = new Date(value.year, value.month - 1, value.day);
            } else if (datatype === "TIME") {
                dt = new Date(0, 0, 0, value.hour, value.minute, value.second);
            } else if (datatype === "DATETIME") {
                dt = new Date(
                    value.year,
                    value.month - 1,
                    value.day,
                    value.hour,
                    value.minute,
                    value.second
                );
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

export function formatNgwAttribute(datatype, value, opt = {}) {
    if (value === null) {
        return null;
    }
    if (isDateType(datatype)) {
        let v = dayjs(value);
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
            v = v.getDate();
            if (datatype === "DATE") {
                return {
                    year: v.getFullYear(),
                    month: v.getMonth() + 1,
                    day: v.getDate(),
                };
            } else if (datatype === "TIME") {
                return {
                    hour: v.getHours(),
                    minute: v.getMinutes(),
                    second: v.getSeconds(),
                };
            } else if (datatype === "DATETIME") {
                return {
                    year: v.getFullYear(),
                    month: v.getMonth() + 1,
                    day: v.getDate(),
                    hour: v.getHours(),
                    minute: v.getMinutes(),
                    second: v.getSeconds(),
                };
            }
        }
    }
    return value;
}
