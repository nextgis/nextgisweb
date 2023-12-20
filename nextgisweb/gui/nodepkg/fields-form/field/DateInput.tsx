import { DatePicker } from "antd";
import type { DatePickerProps } from "antd/lib/date-picker";

import dayjs from "../../dayjs";
import type { FormItemProps } from "../type";

import { FormItem } from "./_FormItem";

type InputProps = DatePickerProps;

export function DateInput({ ...props }: FormItemProps<InputProps>) {
    const localizedDate = dayjs.localeData().longDateFormat("L");
    return (
        <FormItem
            input={(inputProps) => (
                <DatePicker
                    {...{
                        ...inputProps,
                        format: [localizedDate, "YYYY-MM-DD"],
                    }}
                />
            )}
            {...props}
        />
    );
}
