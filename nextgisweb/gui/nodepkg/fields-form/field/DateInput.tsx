import { DatePicker } from "antd";
import type { DatePickerProps } from "antd/lib/date-picker";

import type { FormItemProps } from "../type";

import { FormItem } from "./_FormItem";

type InputProps = DatePickerProps;

export function DateInput({ ...props }: FormItemProps<InputProps>) {
    return <FormItem input={DatePicker} {...props} />;
}
