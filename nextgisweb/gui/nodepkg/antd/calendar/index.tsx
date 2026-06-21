import dayjsGenerateConfig from "@rc-component/picker/es/generate/dayjs";
import generateCalendar from "antd/es/calendar/generateCalendar";
import type { Dayjs } from "dayjs";
import type { ComponentProps } from "react";

import { disableNonPositiveYears } from "../date";

const AntCalendar = generateCalendar<Dayjs>(dayjsGenerateConfig);

export default function Calendar({
  disabledDate = disableNonPositiveYears,
  ...restProps
}: ComponentProps<typeof AntCalendar>) {
  return <AntCalendar disabledDate={disabledDate} {...restProps} />;
}
