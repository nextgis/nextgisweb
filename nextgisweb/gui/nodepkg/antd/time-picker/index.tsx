import type { TimePickerProps } from "antd";
import dayjs from "dayjs";
import type { PickerRef } from "rc-picker";
import { forwardRef } from "react";

import DatePicker from "../date-picker";

const TimePicker = forwardRef<PickerRef, TimePickerProps>((props, ref) => {
    const localizedTime = dayjs.localeData().longDateFormat("LTS");
    return (
        <DatePicker
            {...props}
            picker="time"
            mode={undefined}
            ref={ref}
            format={localizedTime}
        />
    );
});

TimePicker.displayName = "TimePicker";

export default TimePicker;
