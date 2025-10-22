import { useMemo, useState } from "react";

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

type Mode = "keep" | "assign" | "turn_off";
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
    const [mode, setMode] = useState<Mode>(
        value === false ? "turn_off" : "keep"
    );
    const [password, setPassword] = useState<boolean | string>(
        mode === "assign" ? (value ?? "") : ""
    );

    const onModeChange = (nextMode: Mode) => {
        setMode(nextMode);
        if (!onChange) return;

        if (nextMode === "assign") {
            onChange(password);
        } else if (nextMode === "keep") {
            onChange(true);
        } else {
            onChange(false);
        }
    };

    const onPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setPassword(v);
        if (mode === "assign") {
            onChange?.(v);
        }
    };

    // Hide "keep" item if password wasn't assigned.
    const availableModes = useMemo(() => {
        return modes.filter((m) => value !== false || m.value !== "keep");
    }, [value]);

    return (
        <Space.Compact style={{ display: "flex", width: "100%" }}>
            <Select
                onChange={onModeChange}
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
                    onChange={onPasswordChange}
                    disabled={mode !== "assign"}
                    {...inputProps}
                ></Input.Password>
            )}
        </Space.Compact>
    );
};
