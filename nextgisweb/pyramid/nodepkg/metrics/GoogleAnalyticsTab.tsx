import { useState } from "react";
import type { FC } from "react";

import { InputValue } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";

import { gettext } from "../i18n";

import type { TabProps } from "./tab";

const GoogleAnalyticsTab: FC<TabProps<"google_analytics">> = ({
    value,
    onChange,
    readonly,
}) => {
    const [ivalue, setIvalue] = useState<NonNullable<typeof value>>(() => ({
        id: value?.id || "",
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
};

GoogleAnalyticsTab.displayName = "GoogleAnalyticsTab";

export default GoogleAnalyticsTab;
