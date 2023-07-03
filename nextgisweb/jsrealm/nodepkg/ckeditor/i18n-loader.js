/** @entrypoint */
import entrypoint from "@nextgisweb/jsrealm/entrypoint";

export function load(path, require, ready) {
    const lang = window.ngwConfig.locale;
    if (lang === "en") {
        ready();
        return;
    }

    const mod = `ckeditor/translations/${lang}`;

    entrypoint(mod).then(
        () => {
            console.debug(`CKEditor ${lang} i18n: loaded from ${mod}`);
            ready();
        },
        () => {
            console.error(`CKEditor ${lang} i18n: failed to load ${mod}`);
            ready();
        }
    );
}
