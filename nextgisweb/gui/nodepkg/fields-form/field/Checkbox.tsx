import { Checkbox as Checkbox_ } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

import type { FormItemProps } from "../type";

type CheckboxInputProps = Parameters<typeof Checkbox_>[0];

export function Checkbox({
    disabled = false,
    ...props
}: FormItemProps<CheckboxInputProps>) {
    return (
        <FormItem
            valuePropName="checked"
            input={(inputProps) => (
                <Checkbox_ {...{ disabled, ...inputProps }}></Checkbox_>
            )}
            {...props}
        />
    );
}
