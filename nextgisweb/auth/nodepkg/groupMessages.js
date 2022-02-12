import i18n from "@nextgisweb/pyramid/i18n!";

export default function getMessages() {
    return {
        deleteConfirm: i18n.gettext("Delete group?"),
        deleteSuccess: i18n.gettext("Group deleted"),
    };
}
