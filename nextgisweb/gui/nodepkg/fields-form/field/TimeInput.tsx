import { TimePicker } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

import type { TimePickerProps } from "antd/lib/time-picker";
import type { FormItemProps } from "../type";

type InputProps = TimePickerProps;

export function TimeInput({ ...props }: FormItemProps<InputProps>) {
    return (
        <FormItem
            {...props}
            input={(inputProps) => <TimePicker {...inputProps} />}
        />
    );
}
