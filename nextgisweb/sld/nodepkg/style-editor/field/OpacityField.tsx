import { InputNumber } from "@nextgisweb/gui/antd";
import type { FormItemProps } from "@nextgisweb/gui/fields-form";
import { FormItem } from "@nextgisweb/gui/fields-form/field/_FormItem";

type InputNumberProps = Parameters<typeof InputNumber>[0];
type OpacitySliderProps = FormItemProps<InputNumberProps>;

export function OpacityField(props: OpacitySliderProps) {
    return (
        <FormItem
            {...props}
            input={(inputProps) => (
                <InputNumber
                    {...{ ...inputProps, min: 0, max: 1, step: 0.01 }}
                />
            )}
        />
    );
}
