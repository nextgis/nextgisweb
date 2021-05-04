/** @entrypoint */
import entrypoint from "@nextgisweb/jsrealm/entrypoint";

export * from "./load";

// Load translation for pyramid component
entrypoint("@nextgisweb/pyramid/i18n!pyramid");

export function compatHbs(template, jed, context) {
    if (ngwConfig.debug) {
        const msg =
            `Module "ngw-pyramid/hbs-i18n" has been deprecated! Use ` +
            `renderTemplate() from "@nextgisweb/pyramid/i18n" instead.`;
        console.warn(new Error(msg));
    }
    return jed.renderTemplate(template, context);
}
