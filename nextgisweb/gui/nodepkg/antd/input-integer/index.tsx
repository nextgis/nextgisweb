import { clamp } from "lodash-es";

import { InputNumber } from "@nextgisweb/gui/antd";
import type { InputNumberProps } from "@nextgisweb/gui/antd";

export type InputIntegerProps = Omit<InputNumberProps<number>, "formatter">;

const MAX_INT32 = 2 ** 31 - 1;
const MIN_INT32 = -(2 ** 31);

function clampInt(val: number) {
    return clamp(val, MIN_INT32, MAX_INT32);
}

export default function InputInteger({
    min: minProp,
    max: maxProp,
    ...props
}: InputIntegerProps) {
    const min = clampInt(minProp ?? MIN_INT32);
    const max = clampInt(maxProp || MAX_INT32);

    // Formatter is used to ensure the entered value is parsed as an integer
    const formatter = (v: number | string | undefined) => {
        if (typeof v === "string" && v) {
            try {
                const int = parseInt(v, 10);
                return String(clampInt(int));
            } catch {
                return "";
            }
        }
        return "";
    };

    return <InputNumber min={min} max={max} formatter={formatter} {...props} />;
}
