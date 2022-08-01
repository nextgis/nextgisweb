import ManageSearchIcon from "@material-icons/svg/manage_search";
import { Button, Form, Input, Select, Skeleton } from "@nextgisweb/gui/antd";
import { showResourcePicker } from "@nextgisweb/resource/resource-picker";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useCallback, useEffect, useState, useMemo } from "react";
import i18n from "@nextgisweb/pyramid/i18n!auth";

const modes = [
    {
        label: i18n.gettext("Use"),
        value: "use",
    },
    {
        label: i18n.gettext("Not use"),
        value: "notuse",
    },
    {
        label: i18n.gettext("Set new"),
        value: "set",
    },
];

const PasswordInput = ({ value, onChange }) => {
    const [mode, setMode] = useState("use");
    const [password, setPassword] = useState(mode === "set" ? value : "");

    useEffect(() => {
        if (mode === "set") {
            onChange(password);
        } else if (mode === "use") {
            onChange(true);
        } else if (mode === "notuse") {
            onChange(false);
        }
    }, [mode, password]);

    return (
        <Input.Group compact>
            <Select onChange={setMode} style={{ width: "100px" }} value={mode}>
                {modes.map((m) => (
                    <Select.Option key={m.value} value={m.value}>
                        {m.label}
                    </Select.Option>
                ))}
            </Select>
            {mode === "set" && (
                <Input.Password
                    style={{ width: "calc(100% - 100px)" }}
                    value={mode === "set" ? password : ""}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={mode !== "set"}
                ></Input.Password>
            )}
        </Input.Group>
    );
};

export function UserWidgetPassword({ form, ...props }) {
    return (
        <Form.Item {...props}>
            <PasswordInput></PasswordInput>
        </Form.Item>
    );
}
