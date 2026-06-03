import { TimePicker as AntTimePicker } from "antd";
import type { TimePickerProps } from "antd";
import dayjs from "dayjs";

export function TimePicker({ ref, ...props }: TimePickerProps) {
  const localizedTime = dayjs.localeData().longDateFormat("LTS");
  return (
    <AntTimePicker
      {...props}
      mode={undefined}
      ref={ref}
      format={localizedTime}
    />
  );
}

export default TimePicker;
