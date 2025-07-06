import type { CalendarProps } from "antd";
import generateCalendar from "antd/es/calendar/generateCalendar";
import dayjsGenerateConfig from "rc-picker/es/generate/dayjs";

import type dayjs from "@nextgisweb/gui/dayjs";

import { disableNonPositiveYears } from "../date";

const AntCalendar = generateCalendar(dayjsGenerateConfig);

export function Calendar({
    disabledDate = disableNonPositiveYears,
    ...restProps
}: CalendarProps<dayjs.Dayjs>) {
    return <AntCalendar disabledDate={disabledDate} {...restProps} />;
}

export default Calendar;
