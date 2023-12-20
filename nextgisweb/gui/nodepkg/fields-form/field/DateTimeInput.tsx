import { DatePicker } from "antd";
import type { DatePickerProps } from "antd/lib/date-picker";

import dayjs from "../../dayjs";
import type { FormItemProps } from "../type";

import { FormItem } from "./_FormItem";

type InputProps = DatePickerProps;

export function DateTimeInput({ ...props }: FormItemProps<InputProps>) {
    const localizedDate = dayjs.localeData().longDateFormat("L");
    const localizedTime = dayjs.localeData().longDateFormat("LTS");
    const localizedDateTime = localizedDate + " " + localizedTime;
    return (
        <FormItem
            input={(inputProps) => (
                <DatePicker
                    {...{
                        ...inputProps,
                        showTime: true,
                        format: [localizedDateTime, "YYYY-MM-DD HH:mm:ss"],
                    }}
                />
            )}
            {...props}
        />
    );
}
