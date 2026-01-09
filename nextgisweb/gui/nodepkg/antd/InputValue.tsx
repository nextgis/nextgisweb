import { Input } from "antd";
import type { InputProps, InputRef } from "antd";
import type { PasswordProps } from "antd/es/input";
import type { Ref } from "react";

export interface InputValueProps extends Omit<
    InputProps,
    "value" | "onChange"
> {
    value?: string;
    onChange?: (value: string) => void;
    ref?: Ref<InputRef>;
}

export function InputValue({
    ref,
    value,
    onChange,
    ...props
}: InputValueProps) {
    const onChangeEvent: InputProps["onChange"] = (evt) => {
        onChange?.(evt.target.value);
    };
    return (
        <Input ref={ref} value={value} onChange={onChangeEvent} {...props} />
    );
}

export interface PasswordValueProps extends Omit<
    PasswordProps,
    "value" | "onChange"
> {
    value?: string;
    onChange?: (value: string) => void;
    ref?: Ref<InputRef>;
}

export function PasswordValue({
    ref,
    value,
    onChange,
    ...props
}: PasswordValueProps) {
    const onChangeEvent: InputProps["onChange"] = (evt) => {
        onChange?.(evt.target.value);
    };
    return (
        <Input.Password
            ref={ref}
            value={value}
            onChange={onChangeEvent}
            {...props}
        />
    );
}
