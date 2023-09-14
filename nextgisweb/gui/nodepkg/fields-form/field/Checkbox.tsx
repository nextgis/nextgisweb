import { Checkbox as Checkbox_ } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

import type { FormItemProps } from "../type";

type CheckboxInputProps = Parameters<typeof Checkbox_>[0];

export function Checkbox({
    disabled = false,
    inputProps,
    ...props
}: FormItemProps<CheckboxInputProps>) {
    inputProps = inputProps ?? {};
    inputProps = { disabled, ...inputProps };

    return (
        <FormItem
            valuePropName="checked"
            inputProps={inputProps}
            input={Checkbox_}
            {...props}
        />
    );
}
