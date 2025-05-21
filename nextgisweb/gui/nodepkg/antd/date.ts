import type dayjs from "@nextgisweb/gui/dayjs";

export const disableNonPositiveYears = (current: dayjs.Dayjs) => {
    return current && current.year() <= 0;
};
