import { Number } from "./Number";
import type { NumberProps } from "./Number";

export function Integer(props: NumberProps) {
    const inputProps = props.inputProps || {};
    const maxint = 2 ** 63 - 1;
    const max: number = (props.max as number) ?? maxint;
    inputProps.max = max;

    inputProps.formatter = (v) => {
        if (typeof v === "string") {
            const int = parseInt(v, 10);
            const maxInt = int > max ? inputProps.max : int;
            return v ? String(maxInt) : "";
        }
        return "";
    };

    return <Number inputProps={inputProps} {...props}></Number>;
}
