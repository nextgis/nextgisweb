import dayjs from "dayjs";

export function parseNgwAttribute(datatype, value) {
    if (typeof value === "object" && value !== null) {
        let dt;
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
        return dayjs(dt);
    }
    return value;
}

export function formatNgwAttribute(datatype, value) {
    if (value === null) {
        return null;
    }
    if (["DATE", "TIME", "DATETIME"].includes(datatype)) {
        const v = "toDate" in value ? value.toDate() : v;
        if (!(v instanceof Date)) {
            throw new Error(`Value ${value} is not a date`);
        }
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
    return value;
}
