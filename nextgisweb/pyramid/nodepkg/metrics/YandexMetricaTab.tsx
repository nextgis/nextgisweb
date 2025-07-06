import { useState } from "react";
import type { FC } from "react";

import { CheckboxValue, InputValue } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";

import { gettext } from "../i18n";

import type { TabProps } from "./tab";

const YandexMetricaTab: FC<TabProps<"yandex_metrica">> = ({
    value,
    onChange,
    readonly,
}) => {
    const [ivalue, setIvalue] = useState<NonNullable<typeof value>>(() => ({
        id: value?.id || "",
        webvisor: value?.webvisor || false,
    }));

    const update = (k: string, v: unknown) => {
        const newIvalue = { ...ivalue, [k]: v };
        setIvalue(newIvalue);
        if (onChange) {
            onChange(newIvalue.id ? newIvalue : null);
        }
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
};

YandexMetricaTab.displayName = "YandexMetricaTab";

export default YandexMetricaTab;
