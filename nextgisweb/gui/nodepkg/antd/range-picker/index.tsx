import type { RangePickerProps } from "antd/es/date-picker";
import generatePicker from "antd/es/date-picker/generatePicker";
import type { PickerRef } from "rc-picker";
import dayjsGenerateConfig from "rc-picker/es/generate/dayjs";
import type { Ref } from "react";

import { disableNonPositiveYears } from "../date";

const DatePicker = generatePicker(dayjsGenerateConfig);

export interface RangePickerPropsWithRef extends RangePickerProps {
    ref?: Ref<PickerRef>;
}

export function RangePicker({
    ref,
    disabledDate = disableNonPositiveYears,
    ...restProps
}: RangePickerPropsWithRef) {
    return (
        <DatePicker.RangePicker
            ref={ref}
            disabledDate={disabledDate}
            {...restProps}
        />
    );
}

RangePicker.displayName = "RangePicker";

export default RangePicker;
