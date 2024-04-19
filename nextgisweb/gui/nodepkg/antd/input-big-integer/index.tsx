import { InputNumber } from "@nextgisweb/gui/antd";
import type { InputNumberProps } from "@nextgisweb/gui/antd";

export type InputBigIntegerProps = InputNumberProps;

export default function InputBigIntegerProps(props: InputBigIntegerProps) {
    return (
        <InputNumber
            stringMode
            formatter={(val) => {
                if (typeof val === "string") {
                    const v = val.match(/\d+/);
                    return v ? v[0] : "";
                }
                return "";
            }}
            {...props}
        />
    );
}
