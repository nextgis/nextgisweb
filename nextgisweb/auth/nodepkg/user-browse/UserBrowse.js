import { StopOutlined } from "@ant-design/icons";
import { Badge, Button } from "@nextgisweb/gui/antd";
import { ModelBrowse } from "@nextgisweb/gui/model-browse";
import i18n from "@nextgisweb/pyramid/i18n!";
import { useState } from "react";
import { route } from "@nextgisweb/pyramid/api";
import getMessages from "../userMessages";

export function UserBrowse() {
    const columns = [
        {
            title: i18n.gettext("Full name"),
            dataIndex: "display_name",
            key: "display_name",
            sorter: (a, b) => (a.display_name > b.display_name ? 1 : -1),
        },
        {
            title: i18n.gettext("Login"),
            dataIndex: "keyname",
            key: "keyname",
            sorter: (a, b) => (a.keyname > b.keyname ? 1 : -1),
        },
        {
            title: i18n.gettext("Disabled"),
            dataIndex: "disabled",
            key: "disabled",
            render: (text) => {
                return text ? <StopOutlined /> : null;
            },
            sorter: (a, b) => (a.disabled > b.disabled ? 1 : -1),
        },
    ];

    const DisableSelectedUsers = (props) => {
        return ToggleSelectedUsers({ disable: true, ...props });
    };
    const EnableSelectedUsers = (props) => {
        return ToggleSelectedUsers({ disable: false, ...props });
    };

    const [toggleLoading, setToggleLoading] = useState(false);

    const ToggleSelectedUsers = ({ disable, selected, rows, setRows }) => {
        const usersToToggle = [];
        for (const r of rows) {
            if (
                selected.includes(r.id) &&
                (disable ? !r.disabled : r.disabled)
            ) {
                usersToToggle.push(r.id);
            }
        }
        if (!usersToToggle.length) {
            return null;
        }

        const toggleUser = async () => {
            setToggleLoading(true);
            const toggledUsers = [];
            for (const u of usersToToggle) {
                try {
                    const json = {
                        disabled: disable,
                    };
                    await route("auth.user.item", u).put({
                        json,
                    });
                    toggledUsers.push(u);
                } catch {
                    // ignore
                }
            }
            const newRows = [];
            for (const r of rows) {
                if (toggledUsers.includes(r.id)) {
                    const newRow = { ...r };
                    newRow.disabled = disable;
                    newRows.push(newRow);
                } else {
                    newRows.push(r);
                }
            }
            setToggleLoading(false);
            setRows(newRows);
        };

        return (
            <Badge
                count={toggleLoading ? 0 : usersToToggle.length}
                size="small"
                key={
                    disable ? "DisableSelectedControl" : "EnableSelectedControl"
                }
            >
                <Button onClick={toggleUser} loading={toggleLoading}>
                    {disable ? i18n.gettext("Disable") : i18n.gettext("Enable")}
                </Button>
            </Badge>
        );
    };

    return (
        <ModelBrowse
            model="auth.user"
            columns={columns}
            messages={getMessages()}
            collectionOptions={{ query: { brief: true } }}
            collectionFilter={(itm) => !itm.system || itm.keyname == "guest"}
            selectedControl={[DisableSelectedUsers, EnableSelectedUsers]}
        />
    );
}
