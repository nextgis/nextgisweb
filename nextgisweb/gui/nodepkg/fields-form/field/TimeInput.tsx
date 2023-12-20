import type { TimePickerProps } from "antd";

import { TimePicker } from "@nextgisweb/gui/antd";

import dayjs from "../../dayjs";
import type { FormItemProps } from "../type";

import { FormItem } from "./_FormItem";

type InputProps = TimePickerProps;

export function TimeInput({ ...props }: FormItemProps<InputProps>) {
    const localizedTime = dayjs.localeData().longDateFormat("LTS");
    return (
        <FormItem
            {...props}
            input={(inputProps) => (
                <TimePicker
                    {...{
                        ...inputProps,
                        format: localizedTime,
                    }}
                />
            )}
        />
    );
}
