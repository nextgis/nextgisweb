import { gettext } from "@nextgisweb/pyramid/i18n";

import { InputNumber } from "../antd";
import type { InputNumberProps } from "../antd";

const msgNotSet = gettext("Not set");

function formatter(value: number | string | undefined) {
    return value ? `1 : ${value}` : "";
}

function parser(value: string | undefined) {
    if (!value) return "";
    return Number(value.replace(/^1\s*:\s*/, ""));
}

export function InputScaleDenom(props: InputNumberProps) {
    return (
        <InputNumber
            min={1}
            max={1000000000}
            controls={false}
            formatter={formatter}
            parser={parser}
            placeholder={msgNotSet}
            style={{ width: "12em" }}
            {...props}
        />
    );
}
