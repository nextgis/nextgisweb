import PropTypes from "prop-types";
import { Form, Input, Select, Space } from "@nextgisweb/gui/antd";
import { useEffect, useState, useMemo } from "react";
import i18n from "@nextgisweb/pyramid/i18n";
import oauth from "../oauth";

const modes = [
    {
        label: i18n.gettext("Keep existing"),
        value: "keep",
    },
    {
        label: i18n.gettext("Assign new"),
        value: "assign",
    },
    {
        label: oauth.enabled
            ? i18n.gettext("{name} only").replace("{name}", oauth.name)
            : i18n.gettext("Turn off"),
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
                dropdownMatchSelectWidth={false}
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

PasswordInput.propTypes = {
    onChange: PropTypes.func,
    value: PropTypes.any,
};

export function UserWidgetPassword({ autoComplete, placeholder, ...props }) {
    const inputProps = { autoComplete, placeholder };

    return (
        <Form.Item {...props}>
            <PasswordInput {...inputProps}></PasswordInput>
        </Form.Item>
    );
}

UserWidgetPassword.propTypes = {
    autoComplete: PropTypes.string,
    placeholder: PropTypes.string,
};
