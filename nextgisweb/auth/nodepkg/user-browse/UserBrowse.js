import { ModelBrowse } from "@nextgisweb/gui/model-browse";
import i18n from "@nextgisweb/pyramid/i18n!";
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
    ];

    return (
        <ModelBrowse
            model="auth.user"
            columns={columns}
            messages={getMessages()}
            collectionOptions={{ query: { brief: true } }}
            collectionFilter={(itm) => !itm.system || itm.keyname == "guest"}
        />
    );
}
