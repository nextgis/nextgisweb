import { useState } from "react";

import { Badge, Button } from "@nextgisweb/gui/antd";
import type { ControlProps } from "@nextgisweb/gui/model-browse/ModelBrowse";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { UserBrowseData } from "../type";

export const ToggleSelectedUsers = ({
    disable,
    selected,
    rows,
    setRows,
}: ControlProps<UserBrowseData>) => {
    const [toggleLoading, setToggleLoading] = useState(false);
    const usersToToggle: number[] = [];
    for (const r of rows) {
        if (selected.includes(r.id) && (disable ? !r.disabled : r.disabled)) {
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
            key={disable ? "DisableSelectedControl" : "EnableSelectedControl"}
        >
            <Button onClick={toggleUser} loading={toggleLoading}>
                {disable ? gettext("Disable") : gettext("Enable")}
            </Button>
        </Badge>
    );
};
