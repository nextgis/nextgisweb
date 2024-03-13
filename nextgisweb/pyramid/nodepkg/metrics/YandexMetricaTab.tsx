import { useState } from "react";

import { Checkbox, Input } from "@nextgisweb/gui/antd";
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
        <div className="grid">
            <label>{gettext("Tag number")}</label>
            <Input
                value={ivalue.id}
                onChange={(evt) => {
                    if (readonly) return;
                    update("id", evt.target.value);
                }}
                placeholder="00000000"
                allowClear
            />

            <Checkbox
                checked={ivalue.webvisor}
                onChange={(evt) => {
                    if (readonly) return;
                    update("webvisor", evt.target.checked);
                }}
            >
                {gettext("Webvisor")}
            </Checkbox>
        </div>
    );
}
