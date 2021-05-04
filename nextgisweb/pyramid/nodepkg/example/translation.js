/** @entrypoint */
import i18n from "@nextgisweb/pyramid/i18n!";

export default async () => {
    alert(i18n.gettext("Translated text"));
};
