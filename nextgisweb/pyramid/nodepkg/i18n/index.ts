/** @entrypoint */
import { callingComponent } from "../util/loader";

import { domain } from "./gettext";
import { factory } from "./handlebars";

export const normalize = callingComponent;
export function load(
    component: string,
    require: unknown,
    load: { (module: unknown): unknown }
) {
    const gettext = domain(component);
    const module = { renderTemplate: factory(gettext), ...gettext };
    load({ _esModule: true, default: module, ...module });
}

// Only for types, replaced by loader at runtime
const fake = domain("");
export const gettext = fake.gettext;
export const gettextf = fake.gettextf;
export const pgettext = fake.pgettext;
export const pgettextf = fake.pgettextf;
export const ngettext = fake.ngettext;
export const ngettextf = fake.ngettextf;
export const npgettext = fake.npgettext;
export const npgettextf = fake.npgettextf;

export default fake;
