import type { DatePickerProps } from "antd";
import generatePicker from "antd/es/date-picker/generatePicker";
import dayjs from "dayjs";
import type { PickerRef } from "rc-picker";
import dayjsGenerateConfig from "rc-picker/es/generate/dayjs";
import type { Ref } from "react";

import { disableNonPositiveYears } from "../date";

const AntDatePicker = generatePicker(dayjsGenerateConfig);

export interface DatePickerPropsWithRef extends DatePickerProps {
    ref?: Ref<PickerRef>;
}

export function DatePicker({
    ref,
    disabledDate = disableNonPositiveYears,
    ...restProps
}: DatePickerPropsWithRef) {
    const localizedDate = dayjs.localeData().longDateFormat("L");
    return (
        <AntDatePicker
            ref={ref}
            format={[localizedDate, "YYYY-MM-DD"]}
            disabledDate={disabledDate}
            {...restProps}
        />
    );
}

export default DatePicker;
