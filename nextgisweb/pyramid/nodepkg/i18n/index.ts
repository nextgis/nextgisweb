import { domain } from "./gettext";

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
