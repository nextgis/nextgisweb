import { DatePicker as AntDatePicker } from "antd";
import type { DatePickerProps } from "antd";
import dayjs from "dayjs";

import { disableNonPositiveYears } from "../date";

export function DatePicker({
  ref,
  disabledDate = disableNonPositiveYears,
  ...restProps
}: DatePickerProps) {
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
