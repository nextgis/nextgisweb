import type { CalendarProps } from "antd";
import generateCalendar from "antd/es/calendar/generateCalendar";
import type { PickerRef } from "rc-picker";
import dayjsGenerateConfig from "rc-picker/es/generate/dayjs";
import { forwardRef } from "react";

import type dayjs from "@nextgisweb/gui/dayjs";

import { disableNonPositiveYears } from "../date";

const Calendar_ = generateCalendar(dayjsGenerateConfig);

const Calendar = forwardRef<PickerRef, CalendarProps<dayjs.Dayjs>>((props) => {
    const { disabledDate = disableNonPositiveYears, ...restProps } = props;
    return <Calendar_ disabledDate={disabledDate} {...restProps} />;
});

Calendar.displayName = "Calendar";

export default Calendar;
