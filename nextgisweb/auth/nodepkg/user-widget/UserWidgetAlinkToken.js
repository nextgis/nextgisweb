import PropTypes from "prop-types";
import { Form, Input, Select } from "@nextgisweb/gui/antd";
import { useEffect, useState, useMemo } from "react";
import i18n from "@nextgisweb/pyramid/i18n!auth";

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
        label: i18n.gettext("Turn off"),
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
        <Input.Group compact style={{ display: "flex" }}>
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
            {mode === "keep" && (
                <Input
                    style={{ flexGrow: "1" }}
                    value={ngwConfig.applicationUrl + "/alink/" + alink_token}
                    disabled={true}
                ></Input>
            )}
        </Input.Group>
    );
};

AlinkInput.propTypes = {
    onChange: PropTypes.func,
    value: PropTypes.any,
};

export function UserWidgetAlinkToken({ ...props }) {
    return (
        <Form.Item {...props}>
            <AlinkInput></AlinkInput>
        </Form.Item>
    );
}
