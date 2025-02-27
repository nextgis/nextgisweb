import "./index.less";

export const Editor = await ngwExternal("ckeditor");

const lang = window.ngwConfig.locale;
if (lang === "en") {
    // noop
} else if (!Editor.availableLanguages.includes(lang)) {
    console.log(`CKEditor: Translation uavailable for '${lang}'`);
} else {
    await ngwExternal(`ckeditor/${lang}`);
}
