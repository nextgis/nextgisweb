import dayjsGenerateConfig from "@rc-component/picker/es/generate/dayjs";
import generateCalendar from "antd/es/calendar/generateCalendar";
import type { Dayjs } from "dayjs";

import type { ParamsOf } from "@nextgisweb/gui/type";

import { disableNonPositiveYears } from "../date";

const AntCalendar = generateCalendar<Dayjs>(dayjsGenerateConfig);

export default function Calendar({
    disabledDate = disableNonPositiveYears,
    ...restProps
}: ParamsOf<typeof AntCalendar>) {
    return <AntCalendar disabledDate={disabledDate} {...restProps} />;
}
