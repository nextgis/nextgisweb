import "./index.less";

async function loader() {
    const Editor = await ngwEntry("ckeditor/bundle");

    const lang = window.ngwConfig.locale;
    if (lang === "en") {
        // noop
    } else if (!Editor.availableLanguages.includes(lang)) {
        console.warn(`CKEditor: Translation '${lang}' unavailable`);
    } else {
        await ngwEntry(`ckeditor/translations/${lang}`);
        console.log(`CKEditor: Translation '${lang}' loaded`);
    }
    return Editor;
}

export const Editor = await loader();
