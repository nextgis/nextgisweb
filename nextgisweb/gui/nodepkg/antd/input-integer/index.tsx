import { InputNumber } from "@nextgisweb/gui/antd";
import type { InputNumberProps } from "@nextgisweb/gui/antd";

export type InputIntegerProps = InputNumberProps;

export default function InputInteger(props: InputNumberProps) {
    const maxint = 2 ** 63 - 1;
    const max: number = (props.max as number) ?? maxint;

    const formatter = (v: number | string | undefined) => {
        if (typeof v === "string") {
            const int = parseInt(v, 10);
            const maxInt = int > max ? props.max : int;
            return v ? String(maxInt) : "";
        }
        return "";
    };

    return <InputNumber {...props} formatter={formatter} />;
}
