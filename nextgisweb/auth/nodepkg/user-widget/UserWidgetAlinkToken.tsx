import { useEffect, useMemo, useState } from "react";

import { Input, InputProps, Select, Space } from "@nextgisweb/gui/antd";
import type { FormItemProps } from "@nextgisweb/gui/fields-form";
import { FormItem } from "@nextgisweb/gui/fields-form/field/_FormItem";
import { gettext } from "@nextgisweb/pyramid/i18n";

const modes = [
    {
        label: gettext("Keep existing"),
        value: "keep",
    },
    {
        label: gettext("Assign new"),
        value: "assign",
    },
    {
        label: gettext("Turn off"),
        value: "turn_off",
    },
];

let alink_token = "";

type AlinkInputProps = Omit<InputProps, "value" | "onChange"> & {
    value: boolean | string | null;
    onChange: (val: string | boolean | null) => void;
};

const AlinkInput = ({ value, onChange }: AlinkInputProps) => {
    if (typeof value === "string") {
        alink_token = value;
    }
    const [mode, setMode] = useState(value === null ? "turn_off" : "keep");

    useEffect(() => {
        if (mode === "assign") {
            onChange(true);
        } else if (mode === "keep") {
            onChange(null);
        } else if (mode === "turn_off") {
            onChange(false);
        }
    }, [mode, onChange]);

    const availableModes = useMemo(() => {
        return modes.filter((m) => value !== null || m.value !== "keep");
    }, [value]);

    return (
        <Space.Compact style={{ display: "flex", width: "100%" }}>
            <Select
                onChange={setMode}
                popupMatchSelectWidth={false}
                value={mode}
            >
                {availableModes.map((m) => (
                    <Select.Option key={m.value} value={m.value}>
                        {m.label}
                    </Select.Option>
                ))}
            </Select>
            {mode === "keep" && (
                <Input
                    style={{ flexGrow: "1" }}
                    value={ngwConfig.applicationUrl + "/alink/" + alink_token}
                    disabled={true}
                ></Input>
            )}
            {mode === "assign" && (
                <Input
                    style={{ flexGrow: "1" }}
                    value={gettext(
                        "The generated link will be available after saving."
                    )}
                    disabled={true}
                ></Input>
            )}
        </Space.Compact>
    );
};

export function UserWidgetAlinkToken({
    ...props
}: FormItemProps<AlinkInputProps>) {
    return <FormItem {...props} input={AlinkInput} />;
}
