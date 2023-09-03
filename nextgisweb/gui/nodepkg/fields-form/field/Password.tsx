import { Input } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

import type { FormItemProps } from "../type";

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
    ...props
}: PasswordProps) {
    return (
        <FormItem
            {...props}
            input={(inputProps) => (
                <Input.Password
                    visibilityToggle={false}
                    {...{ autoComplete, placeholder, ...inputProps }}
                />
            )}
        />
    );
}
