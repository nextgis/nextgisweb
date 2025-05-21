import dayjs from "dayjs";
import { default as _localeData } from "dayjs/plugin/localeData";
import { default as _localizedFormat } from "dayjs/plugin/localizedFormat";
import { default as _relativeTime } from "dayjs/plugin/relativeTime";
import { default as _utc } from "dayjs/plugin/utc";

// WARNING: Avoid using the dayjs/plugin/timezone plugin as it creates problems
// with the DatePicker widget when handling dates before the year 99, including
// BC dates.

for (const plugin of [_utc, _localizedFormat, _relativeTime, _localeData]) {
    dayjs.extend(plugin);
}

export default dayjs;
export const utc = dayjs.utc;
