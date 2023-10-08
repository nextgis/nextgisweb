import { gettext } from "@nextgisweb/pyramid/i18n";

export default function getMessages() {
    return {
        deleteConfirm: gettext("Delete SRS?"),
        deleteSuccess: gettext("SRS deleted"),
    };
}
