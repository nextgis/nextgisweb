import { DatePicker } from "antd";
import type { DatePickerProps } from "antd/lib/date-picker";

import type { FormItemProps } from "../type";

import { FormItem } from "./_FormItem";

type InputProps = DatePickerProps;

export function DateTimeInput({ ...props }: FormItemProps<InputProps>) {
    return (
        <FormItem
            input={(inputProps) => (
                <DatePicker {...{ ...inputProps, showTime: true }} />
            )}
            {...props}
        />
    );
}
