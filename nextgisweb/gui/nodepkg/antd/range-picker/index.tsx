import { DatePicker } from "antd";
import type { ComponentProps } from "react";

import { disableNonPositiveYears } from "../date";

export default function RangePicker({
  ref,
  disabledDate = disableNonPositiveYears,
  ...restProps
}: ComponentProps<typeof DatePicker.RangePicker>) {
  return (
    <DatePicker.RangePicker
      ref={ref}
      disabledDate={disabledDate}
      {...restProps}
    />
  );
}
