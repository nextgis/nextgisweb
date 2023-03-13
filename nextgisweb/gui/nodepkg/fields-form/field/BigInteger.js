import PropTypes from "prop-types";

import { InputNumber } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

const InputNumber_ = ({ value, onChange, ...inputProps }) => {
    const formatter = (v) => {
        v = v.match(/\d+/)
        return v ? v[0] : "";
    };

    // const onChange_ = (v) => {
    //     onChange(BigInt(formatter(v)));
    // };

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

InputNumber_.propTypes = {
    onChange: PropTypes.func,
    value: PropTypes.any,
};

export function BigInteger({ min, max, ...props }) {
    return (
        <FormItem
            {...props}
            input={(inputProps) => (
                <InputNumber_ {...{ min, max, ...inputProps }} />
            )}
        />
    );
}

BigInteger.propTypes = {
    inputProps: PropTypes.object,
    max: PropTypes.number,
    min: PropTypes.number,
};
