import { gettext } from "@nextgisweb/pyramid/i18n";

export const KeynameRule = {
    pattern: new RegExp(/^[A-Za-z][\w-]*$/g),
    message: gettext("The value entered is not valid"),
};
