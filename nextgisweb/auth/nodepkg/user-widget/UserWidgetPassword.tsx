import { useEffect, useMemo, useState } from "react";

import { Input, Select, Space } from "@nextgisweb/gui/antd";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";

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
            ? gettextf("{name} only")({ name: oauth.name })
            : gettext("Turn off"),
        value: "turn_off",
    },
];

type PasswordInputProps = Parameters<typeof Input.Password>[0];

type InputProps = Omit<PasswordInputProps, "value" | "onChange"> & {
    value?: boolean | string;
    onChange?: (val: string | boolean) => void;
};

export const UserWidgetPassword = ({
    value,
    onChange,
    ...inputProps
}: InputProps) => {
    const [mode, setMode] = useState(value === false ? "turn_off" : "keep");
    const [password, setPassword] = useState<boolean | string>(
        mode === "assign" ? (value ?? "") : ""
    );

    useEffect(() => {
        if (onChange) {
            if (mode === "assign") {
                onChange(password);
            } else if (mode === "keep") {
                onChange(true);
            } else if (mode === "turn_off") {
                onChange(false);
            }
        }
    }, [mode, onChange, password]);

    // Hide "keep" item if password wasn't assigned.
    const availableModes = useMemo(() => {
        return modes.filter((m) => value !== false || m.value !== "keep");
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
            {mode === "assign" && (
                <Input.Password
                    style={{ flexGrow: "1" }}
                    value={mode === "assign" ? String(password) : ""}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={mode !== "assign"}
                    {...inputProps}
                ></Input.Password>
            )}
        </Space.Compact>
    );
};
