import { useState } from "react";

import { CheckboxValue, InputValue } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import type { Metrics } from "@nextgisweb/pyramid/type/api";

import { gettext } from "../i18n";

import type { TabProps } from "./tab";

type TabValue = NonNullable<Metrics["yandex_metrica"]>;

export default function YandexMetricaTab({
    value,
    onChange,
    readonly,
}: TabProps<TabValue>) {
    const [ivalue, setIvalue] = useState<TabValue>(() => ({
        id: value?.id || "",
        webvisor: value?.webvisor || false,
    }));

    const update = (k: string, v: unknown) => {
        const newIvalue = { ...ivalue, [k]: v };
        setIvalue(newIvalue);
        onChange && onChange(newIvalue.id ? newIvalue : null);
    };

    return (
        <Area>
            <Lot label={gettext("Tag number")}>
                <InputValue
                    value={ivalue.id}
                    onChange={(v) => {
                        if (readonly) return;
                        update("id", v);
                    }}
                    placeholder="00000000"
                    allowClear
                />
            </Lot>

            <Lot>
                <CheckboxValue
                    value={ivalue.webvisor}
                    onChange={(v) => {
                        if (readonly) return;
                        update("webvisor", v);
                    }}
                >
                    {gettext("Webvisor")}
                </CheckboxValue>
            </Lot>
        </Area>
    );
}
