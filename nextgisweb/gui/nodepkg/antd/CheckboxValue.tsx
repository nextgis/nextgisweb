import { Checkbox } from "antd";
import type { CheckboxProps, CheckboxRef } from "antd";

export interface CheckboxValueProps
    extends Omit<CheckboxProps, "value" | "checked" | "onChange"> {
    value?: boolean;
    onChange?: (value: boolean) => void;
    ref?: React.Ref<CheckboxRef>;
}

export function CheckboxValue({
    ref,
    value = false,
    onChange,
    ...props
}: CheckboxValueProps) {
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
