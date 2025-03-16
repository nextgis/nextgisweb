import type { DatePickerProps } from "antd/es/date-picker";
import type { PickerRef } from "rc-picker";
import { forwardRef } from "react";

import dayjs from "../../dayjs";
import DatePicker from "../date-picker";

const DateTimePicker = forwardRef<PickerRef, DatePickerProps>((props, ref) => {
    const localizedDate = dayjs.localeData().longDateFormat("L");
    const localizedTime = dayjs.localeData().longDateFormat("LTS");
    const localizedDateTime = localizedDate + " " + localizedTime;

    return (
        <DatePicker
            showTime
            format={[localizedDateTime, "YYYY-MM-DD HH:mm:ss"]}
            ref={ref}
            {...props}
        />
    );
});

DateTimePicker.displayName = "DateTimePicker";
export default DateTimePicker;
