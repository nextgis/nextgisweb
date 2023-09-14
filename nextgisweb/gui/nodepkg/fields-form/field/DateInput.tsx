import { DatePicker } from "antd";

import { FormItem } from "./_FormItem";

import type { DatePickerProps } from "antd/lib/date-picker";
import type { FormItemProps } from "../type";

type InputProps = DatePickerProps;

export function DateInput({ ...props }: FormItemProps<InputProps>) {
    return <FormItem input={DatePicker} {...props} />;
}
