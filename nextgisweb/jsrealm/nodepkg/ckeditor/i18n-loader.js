/** @entrypoint */
import * as Editor from "ckeditor/bundle";

export function load(path, require, ready) {
    const lang = window.ngwConfig.locale;
    if (lang === "en") {
        ready();
        return;
    }

    if (!Editor.availableLanguages.includes(lang)) {
        console.warn(`CKEditor: Translation '${lang}' unavailable`);
        ready();
        return;
    }

    const mod = `ckeditor/translations/${lang}`;
    window.ngwEntry(mod).then(
        () => {
            console.log(`CKEditor: Translation '${lang}' loaded`);
            ready();
        },
        () => {
            console.error(`CKEditor: Translation '${lang}' failed`);
            ready();
        }
    );
}
