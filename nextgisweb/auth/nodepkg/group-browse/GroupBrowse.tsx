import type { TableProps } from "@nextgisweb/gui/antd";
import { ModelBrowse } from "@nextgisweb/gui/model-browse";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { default as oauth } from "../oauth";

const messages = {
    deleteConfirm: gettext("Delete group?"),
    deleteSuccess: gettext("Group deleted"),
};

interface GroupBrowseProps {
    readonly: boolean;
}

export function GroupBrowse({readonly}: GroupBrowseProps) {
    const columns: TableProps["columns"] = [
        {
            title: gettext("Full name"),
            dataIndex: "display_name",
            key: "display_name",
            sorter: (a, b) => (a.display_name > b.display_name ? 1 : -1),
        },
        {
            title: gettext("Group name"),
            dataIndex: "keyname",
            key: "keyname",
            sorter: (a, b) => (a.keyname > b.keyname ? 1 : -1),
        },
        {
            title: gettext("New users"),
            dataIndex: "register",
            key: "register",
            render: (value) => (value ? gettext("Yes") : gettext("No")),
        },
    ];

    if (oauth.group_mapping) {
        columns.push({
            title: oauth.name,
            dataIndex: "oauth_mapping",
            key: "oauth_mapping",
            render: (value) => (value ? gettext("Yes") : gettext("No")),
        });
    }

    return (
        <ModelBrowse
            readonly={readonly}
            model="auth.group"
            {...{ columns, messages }}
        />
    );
}
