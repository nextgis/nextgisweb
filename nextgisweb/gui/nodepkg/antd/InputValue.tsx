import { Input } from "antd";
import type { InputProps, InputRef } from "antd";
import type { PasswordProps } from "antd/es/input";
import { forwardRef } from "react";

export interface InputValueProps
    extends Omit<InputProps, "value" | "onChange"> {
    value?: string;
    onChange?: (value: string) => void;
}

export const InputValue = forwardRef<InputRef, InputValueProps>(
    ({ value, onChange, ...props }, ref) => {
        const onChangeEvent: InputProps["onChange"] = (evt) => {
            onChange?.(evt.target.value);
        };
        return (
            <Input
                ref={ref}
                value={value}
                onChange={onChangeEvent}
                {...props}
            />
        );
    }
);

InputValue.displayName = "InputValue";

export interface PasswordValueProps
    extends Omit<PasswordProps, "value" | "onChange"> {
    value?: string;
    onChange?: (value: string) => void;
}

export const PasswordValue = forwardRef<InputRef, PasswordValueProps>(
    ({ value, onChange, ...props }, ref) => {
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
);

PasswordValue.displayName = "PasswordValue";
