import { Input } from "@nextgisweb/gui/antd";

import type { FormItemProps } from "../type";

import { FormItem } from "./_FormItem";

type InputProps = Parameters<typeof Input.Password>[0];

type PasswordProps = FormItemProps<InputProps> & {
    /** @deprecated move to inputProps */
    autoComplete?: InputProps["autoComplete"];
    /** @deprecated move to inputProps */
    placeholder?: string;
};

export function Password({
    placeholder,
    autoComplete,
    inputProps,
    ...props
}: PasswordProps) {
    inputProps = inputProps ?? {};
    inputProps = {
        visibilityToggle: false,
        autoComplete,
        placeholder,
        ...inputProps,
    };
    return (
        <FormItem {...props} inputProps={inputProps} input={Input.Password} />
    );
}
