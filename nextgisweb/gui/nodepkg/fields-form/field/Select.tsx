import type { SelectProps as AntdSelectProps } from "antd/lib/select";

import { Select as AntdSelect } from "@nextgisweb/gui/antd";

import type { FormFieldChoice, FormItemProps } from "../type";

import { FormItem } from "./_FormItem";

type InputProps = Parameters<typeof AntdSelect>[0];

type SelectProps = FormItemProps<AntdSelectProps> & {
    choices?: FormFieldChoice[];
    /** @deprecated move to inputProps */
    mode?: InputProps["mode"];
};

export function Select({ choices, mode, ...props }: SelectProps) {
    if (!choices) {
        throw new Error("The `choices` is required field for Select field");
    }
    return (
        <FormItem
            {...props}
            input={(inputProps) => (
                <AntdSelect {...{ mode, ...inputProps }}>
                    {choices.map(({ label, value, ...optionProps }) => (
                        <AntdSelect.Option
                            key={value}
                            value={value}
                            {...optionProps}
                        >
                            {label}
                        </AntdSelect.Option>
                    ))}
                </AntdSelect>
            )}
        />
    );
}
