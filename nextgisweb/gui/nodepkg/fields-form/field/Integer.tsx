import { Number } from "./Number";

import type { InputNumberProps } from "antd/lib/input-number";
import type { FormItemProps } from "../type";

type NumberProps = FormItemProps<InputNumberProps<number>> & {
    /** @deprecated move to inputProps */
    min?: InputNumberProps<number>["min"];
    /** @deprecated move to inputProps */
    max?: InputNumberProps<number>["max"];
};

export function Integer(props: NumberProps) {
    const inputProps = props.inputProps || {};
    const maxint = 2 ** 63 - 1;
    inputProps.max = props.max ?? maxint;

    inputProps.formatter = (v) => {
        if (typeof v === "string") {
            const int = parseInt(v, 10);
            const maxInt = int > inputProps.max ? inputProps.max : int;
            return v ? String(maxInt) : "";
        }
    };

    return <Number inputProps={inputProps} {...props}></Number>;
}
