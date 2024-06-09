import { useState } from "react";

import { InputValue } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import type { Metrics } from "@nextgisweb/pyramid/type/api";

import { gettext } from "../i18n";

import type { TabProps } from "./tab";

type TabValue = NonNullable<Metrics["google_analytics"]>;

export default function GoogleAnalyticsTab({
    value,
    onChange,
    readonly,
}: TabProps<TabValue>) {
    const [ivalue, setIvalue] = useState<TabValue>(() => ({
        id: value?.id || "",
    }));

    const update = (k: string, v: unknown) => {
        const newIvalue = { ...ivalue, [k]: v };
        setIvalue(newIvalue);
        onChange && onChange(newIvalue.id ? newIvalue : null);
    };

    return (
        <Area>
            <Lot label={gettext("Measurement ID")}>
                <InputValue
                    value={ivalue.id}
                    onChange={(v) => {
                        if (readonly) return;
                        update("id", v);
                    }}
                    placeholder="G-XXXXXXXXXX"
                    allowClear
                />
            </Lot>
        </Area>
    );
}
