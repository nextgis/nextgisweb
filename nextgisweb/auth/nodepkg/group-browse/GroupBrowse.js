import { ModelBrowse } from "@nextgisweb/gui/model-browse";
import i18n from "@nextgisweb/pyramid/i18n!";

export function GroupBrowse() {
    const columns = [
        {
            title: i18n.gettext("Full name"),
            dataIndex: "display_name",
            key: "display_name",
            sorter: (a, b) => (a.display_name > b.display_name ? 1 : -1),
        },
        {
            title: i18n.gettext("Group name"),
            dataIndex: "keyname",
            key: "keyname",
            sorter: (a, b) => (a.keyname > b.keyname ? 1 : -1),
        },
    ];

    const messages = {
        deleteConfirm: i18n.gettext("Delete group?"),
        deleteSuccess: i18n.gettext("Group deleted"),
    };

    return (
        <ModelBrowse model="auth.group" columns={columns} messages={messages} />
    );
}
