import { InputNumber } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";
import type { FormItemProps } from "../type";

type InputNumberProps = Parameters<typeof InputNumber>[0];

type BigIntegerProps = FormItemProps<InputNumberProps> & {
    /** @deprecated move to inputProps */
    min?: InputNumberProps["min"];
    /** @deprecated move to inputProps */
    max?: InputNumberProps["max"];
};

const InputNumber_ = ({ value, onChange, ...inputProps }: InputNumberProps) => {
    const formatter = (v) => {
        v = v.match(/\d+/);
        return v ? v[0] : "";
    };

    return (
        <InputNumber
            stringMode
            value={value}
            onChange={onChange}
            formatter={formatter}
            {...inputProps}
        />
    );
};

export function BigInteger({ min, max, ...props }: BigIntegerProps) {
    return (
        <FormItem
            {...props}
            input={(inputProps) => (
                <InputNumber_ {...{ min, max, ...inputProps }} />
            )}
        />
    );
}
