import type { TimePickerProps } from "antd";
import dayjs from "dayjs";
import type { PickerRef } from "rc-picker";
import type { Ref } from "react";

import DatePicker from "../date-picker";

export interface TimePickerPropsWithRef extends TimePickerProps {
    ref?: Ref<PickerRef>;
}

export function TimePicker({ ref, ...props }: TimePickerPropsWithRef) {
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
}

export default TimePicker;
