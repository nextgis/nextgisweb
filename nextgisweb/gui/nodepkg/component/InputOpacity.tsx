import { InputNumber } from "../antd";
import type { InputNumberProps } from "../antd";

function formatter(
    value: number | string | undefined,
    opts: { userTyping: boolean; input: string; valuePercent: boolean }
) {
    if (opts.userTyping) return opts.input;
    return value
        ? `${(Number(value) * (opts.valuePercent ? 1 : 100)).toFixed(0)} %`
        : "";
}

function parser(value: string | undefined, opts: { valuePercent: boolean }) {
    if (!value) return "";
    return Number(value.replace(/\s*%$/, "")) / (opts.valuePercent ? 1 : 100);
}

export interface InputOpacityProps extends InputNumberProps {
    mode?: "opacity" | "transparency";
    valuePercent?: boolean;
}

export function InputOpacity({
    mode = "opacity",
    valuePercent = false,
    ...props
}: InputOpacityProps) {
    const scale = valuePercent ? 100 : 1;
    return (
        <InputNumber
            min={0}
            max={scale}
            step={0.05 * scale}
            formatter={(value, opts) =>
                formatter(value, { ...opts, valuePercent })
            }
            parser={(value) => parser(value, { valuePercent })}
            placeholder={mode === "transparency" ? "0 %" : "100 %"}
            {...props}
        />
    );
}
