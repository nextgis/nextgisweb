import { useEffect, useMemo, useState } from "react";

import { Form, Input, Select, Space } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import oauth from "../oauth";

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
        label: oauth.enabled
            ? gettext("{name} only").replace("{name}", oauth.name)
            : gettext("Turn off"),
        value: "turn_off",
    },
];

const PasswordInput = ({ value, onChange, ...inputProps }) => {
    const [mode, setMode] = useState(value === false ? "turn_off" : "keep");
    const [password, setPassword] = useState(mode === "assign" ? value : "");

    useEffect(() => {
        if (mode === "assign") {
            onChange(password);
        } else if (mode === "keep") {
            onChange(true);
        } else if (mode === "turn_off") {
            onChange(false);
        }
    }, [mode, password]);

    // Hide "keep" item if password wasn't assigned.
    const availableModes = useMemo(() => {
        return modes.filter((m) => value !== false || m.value !== "keep");
    }, []);

    return (
        <Space.Compact style={{ display: "flex" }}>
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
            {mode === "assign" && (
                <Input.Password
                    style={{ flexGrow: "1" }}
                    value={mode === "assign" ? password : ""}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={mode !== "assign"}
                    {...inputProps}
                ></Input.Password>
            )}
        </Space.Compact>
    );
};

export function UserWidgetPassword({ autoComplete, placeholder, ...props }) {
    const inputProps = { autoComplete, placeholder };

    return (
        <Form.Item {...props}>
            <PasswordInput {...inputProps}></PasswordInput>
        </Form.Item>
    );
}
