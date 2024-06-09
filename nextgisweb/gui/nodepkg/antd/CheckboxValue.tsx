import { Checkbox } from "antd";
import type { CheckboxProps, CheckboxRef } from "antd";
import { forwardRef } from "react";

export interface CheckboxValueProps
    extends Omit<CheckboxProps, "value" | "checked" | "onChange"> {
    value?: boolean;
    onChange?: (value: boolean) => void;
}

export const CheckboxValue = forwardRef<CheckboxRef, CheckboxValueProps>(
    ({ value, onChange, ...props }, ref) => {
        const onChangeEvent: CheckboxProps["onChange"] = (evt) => {
            onChange?.(evt.target.checked);
        };
        return (
            <Checkbox
                ref={ref}
                checked={value}
                onChange={onChangeEvent}
                {...props}
            />
        );
    }
);

CheckboxValue.displayName = "CheckboxValue";
