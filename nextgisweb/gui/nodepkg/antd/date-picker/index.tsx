import type { DatePickerProps } from "antd";
import generatePicker from "antd/es/date-picker/generatePicker";
import dayjs from "dayjs";
import type { PickerRef } from "rc-picker";
import dayjsGenerateConfig from "rc-picker/es/generate/dayjs";
import { forwardRef } from "react";

import { disableNonPositiveYears } from "../date";

const DatePicker_ = generatePicker(dayjsGenerateConfig);

const DatePicker = forwardRef<PickerRef, DatePickerProps>((props, ref) => {
    const { disabledDate = disableNonPositiveYears, ...restProps } = props;
    const localizedDate = dayjs.localeData().longDateFormat("L");
    return (
        <DatePicker_
            ref={ref}
            format={[localizedDate, "YYYY-MM-DD"]}
            disabledDate={disabledDate}
            {...restProps}
        />
    );
});

DatePicker.displayName = "DatePicker";

export default DatePicker;
