import type { DatePickerProps } from "antd/es/date-picker";
import type { PickerRef } from "rc-picker";
import type { Ref } from "react";

import dayjs from "../../dayjs";
import DatePicker from "../date-picker";

export interface DateTimePickerProps extends DatePickerProps {
    ref?: Ref<PickerRef>;
}

export function DateTimePicker({ ref, ...props }: DateTimePickerProps) {
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
}

export default DateTimePicker;
