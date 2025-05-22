import type { RangePickerProps } from "antd/es/date-picker";
import generatePicker from "antd/es/date-picker/generatePicker";
import type { PickerRef } from "rc-picker";
import dayjsGenerateConfig from "rc-picker/es/generate/dayjs";
import { forwardRef } from "react";

import { disableNonPositiveYears } from "../date";

const DatePicker = generatePicker(dayjsGenerateConfig);

const RangePicker = forwardRef<PickerRef, RangePickerProps>((props, ref) => {
    const { disabledDate = disableNonPositiveYears, ...restProps } = props;
    return (
        <DatePicker.RangePicker
            ref={ref}
            disabledDate={disabledDate}
            {...restProps}
        />
    );
});

RangePicker.displayName = "RangePicker";

export default RangePicker;
