import { InputNumber } from "@nextgisweb/gui/antd";

import type { FormItemProps } from "../type";

import { FormItem } from "./_FormItem";

type InputNumberProps = Parameters<typeof InputNumber>[0];

type BigIntegerProps = FormItemProps<InputNumberProps> & {
    /** @deprecated moved to {@link FormItemProps.inputProps} */
    min?: InputNumberProps["min"];
    /** @deprecated moved to {@link FormItemProps.inputProps} */
    max?: InputNumberProps["max"];
};

const InputNumber_ = ({ value, onChange, ...inputProps }: InputNumberProps) => {
    return (
        <InputNumber
            stringMode
            value={value}
            onChange={onChange}
            formatter={(val) => {
                if (typeof val === "string") {
                    const v = val.match(/\d+/);
                    return v ? v[0] : "";
                }
                return "";
            }}
            {...inputProps}
        />
    );
};

export function BigInteger({
    min,
    max,
    inputProps,
    ...props
}: BigIntegerProps) {
    inputProps = inputProps ?? {};
    inputProps = { min, max, ...inputProps };
    return <FormItem {...props} inputProps={inputProps} input={InputNumber_} />;
}
