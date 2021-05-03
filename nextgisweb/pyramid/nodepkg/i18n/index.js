/** @entrypoint */
import entrypoint from "@nextgisweb/jsrealm/entrypoint";

export * from "./load";

// Load translation for pyramid component
entrypoint("@nextgisweb/pyramid/i18n!pyramid");

export function compatHbs(template, jed, context) {
    return jed.renderTemplate(template, context);
}
