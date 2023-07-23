import handlebars from "handlebars/handlebars";

export function factory({ gettext }) {
    const instance = handlebars.create();
    instance.registerHelper("gettext", gettext);
    instance.registerHelper("gettextString", (m) => JSON.stringify(gettext(m)));
    return (tpl, ctx) => instance.compile(tpl)(ctx || {});
}
