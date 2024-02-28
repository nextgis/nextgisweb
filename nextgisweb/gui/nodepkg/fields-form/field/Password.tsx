import { Input } from "@nextgisweb/gui/antd";

import type { FormItemProps } from "../type";

import { FormItem } from "./_FormItem";

type InputProps = Parameters<typeof Input.Password>[0];

export type PasswordProps = FormItemProps<InputProps>;

export function Password({ inputProps, ...props }: PasswordProps) {
    inputProps = inputProps ?? {};
    inputProps = {
        visibilityToggle: false,
        ...inputProps,
    };
    return (
        <FormItem {...props} inputProps={inputProps} input={Input.Password} />
    );
}
