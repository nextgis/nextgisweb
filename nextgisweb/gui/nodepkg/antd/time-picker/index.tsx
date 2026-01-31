import dayjsGenerateConfig from "@rc-component/picker/es/generate/dayjs";
import type { TimePickerProps } from "antd";
import generatePicker from "antd/es/date-picker/generatePicker";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

const AntPicker = generatePicker<Dayjs>(dayjsGenerateConfig);
const AntTimePicker = AntPicker.TimePicker;

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
