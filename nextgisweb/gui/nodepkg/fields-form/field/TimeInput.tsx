import type { TimePickerProps } from "antd/lib/time-picker";

import { TimePicker } from "@nextgisweb/gui/antd";

import type { FormItemProps } from "../type";

import { FormItem } from "./_FormItem";

type InputProps = TimePickerProps;

export function TimeInput({ ...props }: FormItemProps<InputProps>) {
    return (
        <FormItem
            {...props}
            input={(inputProps) => <TimePicker {...inputProps} />}
        />
    );
}
