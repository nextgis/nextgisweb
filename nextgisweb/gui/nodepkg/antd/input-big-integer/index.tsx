import { InputNumber } from "@nextgisweb/gui/antd";
import type { InputNumberProps } from "@nextgisweb/gui/antd";

export type InputBigIntegerProps = Omit<InputNumberProps<string>, "stringMode">;

const MAX_INT64 = (BigInt(1) << BigInt(63)) - BigInt(1);
const MIN_INT64 = -(BigInt(1) << BigInt(63));

function clampBigInt(value: string | number | bigint): bigint {
    const v = typeof value === "bigint" ? value : BigInt(value);
    return v < MIN_INT64 ? MIN_INT64 : v > MAX_INT64 ? MAX_INT64 : v;
}

export default function InputBigInteger({
    min: minProp,
    max: maxProp,
    ...props
}: InputBigIntegerProps) {
    const min = minProp !== undefined ? clampBigInt(minProp) : MIN_INT64;
    const max = maxProp !== undefined ? clampBigInt(maxProp) : MAX_INT64;

    // Formatter ensures the entered value is parsed as a bigint
    const formatter = (v: number | string | undefined) => {
        if (typeof v === "string" && v) {
            try {
                const bigIntPart = v.split(".")[0];
                const clamped = clampBigInt(bigIntPart);
                return String(clamped);
            } catch {
                return "";
            }
        }
        return "";
    };

    return (
        <InputNumber
            stringMode
            max={max.toString()}
            min={min.toString()}
            formatter={formatter}
            {...props}
        />
    );
}
