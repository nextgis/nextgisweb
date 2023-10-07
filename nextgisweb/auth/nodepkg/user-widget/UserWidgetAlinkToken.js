import { useEffect, useMemo, useState } from "react";

import { Form, Input, Select, Space } from "@nextgisweb/gui/antd";
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

const AlinkInput = ({ value, onChange }) => {
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
    }, [mode]);

    const availableModes = useMemo(() => {
        return modes.filter((m) => value !== null || m.value !== "keep");
    }, []);

    return (
        <Space.Compact compact style={{ display: "flex" }}>
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

export function UserWidgetAlinkToken({ ...props }) {
    return (
        <Form.Item {...props}>
            <AlinkInput></AlinkInput>
        </Form.Item>
    );
}
