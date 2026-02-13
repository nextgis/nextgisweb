import dayjsGenerateConfig from "@rc-component/picker/es/generate/dayjs";
import generatePicker from "antd/es/date-picker/generatePicker";
import type { Dayjs } from "dayjs";

import type { ParamsOf } from "@nextgisweb/gui/type";

import { disableNonPositiveYears } from "../date";

const DatePicker = generatePicker<Dayjs>(dayjsGenerateConfig);

type RangePickerPropsWithRef = ParamsOf<typeof DatePicker.RangePicker>;

export default function RangePicker({
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
