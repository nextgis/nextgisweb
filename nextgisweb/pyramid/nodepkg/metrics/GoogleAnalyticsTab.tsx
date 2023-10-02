import { useState } from "react";

import { Input } from "@nextgisweb/gui/antd";

import { gettext } from "../i18n";

import type { TabProps } from "./tab";

export interface TV {
    id: string;
}

export default function GoogleAnalyticsTab({
    value,
    onChange,
    readonly,
}: TabProps<TV>) {
    const [ivalue, setIvalue] = useState<TV>(() => ({
        id: value?.id || "",
    }));

    const update = (k: string, v: unknown) => {
        const newIvalue = { ...ivalue, [k]: v };
        setIvalue(newIvalue);
        onChange && onChange(newIvalue.id ? newIvalue : null);
    };

    return (
        <div className="grid">
            <label>{gettext("Measurement ID")}</label>
            <Input
                value={ivalue.id}
                onChange={(evt) => {
                    if (readonly) return;
                    update("id", evt.target.value);
                }}
                placeholder="G-XXXXXXXXXX"
                allowClear
            />
        </div>
    );
}
