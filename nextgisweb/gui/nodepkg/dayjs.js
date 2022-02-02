import dayjs from "dayjs";
import { default as _utc } from "dayjs/plugin/utc";
import { default as _timezone } from "dayjs/plugin/timezone";
import { default as _localizedFormat } from "dayjs/plugin/localizedFormat";

for (const plugin of [_utc, _timezone, _localizedFormat]) {
    dayjs.extend(plugin);
}

export default dayjs;
export const utc = dayjs.utc;
