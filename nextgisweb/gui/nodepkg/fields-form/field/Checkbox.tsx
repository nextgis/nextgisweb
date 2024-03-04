import { Checkbox as Checkbox_ } from "@nextgisweb/gui/antd";

import type { FormItemProps } from "../type";

import { FormItem } from "./_FormItem";

type CheckboxInputProps = Parameters<typeof Checkbox_>[0];

export function Checkbox({
    disabled,
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
