/* entry: true */
import { default as i18n } from "ngw-pyramid/i18n!jsrealm"

export default async () => {
    alert(i18n.gettext("Translated text"));
}
