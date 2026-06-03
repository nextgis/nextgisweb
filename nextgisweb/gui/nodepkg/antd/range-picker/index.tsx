import { DatePicker } from "antd";

import type { ParamsOf } from "@nextgisweb/gui/type";

import { disableNonPositiveYears } from "../date";

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
