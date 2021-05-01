/* entrypoint: true */
import i18n from "@nextgisweb/jsrealm/i18n!jsrealm"

export default async () => {
    alert(i18n.gettext("Translated text"));
}
