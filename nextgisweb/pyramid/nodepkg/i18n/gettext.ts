import { lookup, nlookup } from "@nextgisweb/jsrealm/i18n/catalog";

import { compile } from "./format";
import type { Compiled, FormatArgs } from "./format";

import "@nextgisweb/jsrealm/locale-loader!";

const en = ngwConfig.locale === "en";
const [pn, pf] = ngwConfig.plurals;

type MParam = [message: string];
type NParam = [singular: string, plural: string, n: number];

type Context = [context: string];
type CMParam = [...Context, ...MParam];
type CNParam = [...Context, ...NParam];

export function dpgettext(
    domain: string,
    ...[context, message]: CMParam
): string {
    if (en) return message;
    return lookup(domain, context, message);
}

export function dnpgettext(
    domain: string,
    ...[context, singular, plural, n]: CNParam
): string {
    if (en) return [singular, plural][pf(n)];
    return nlookup(domain, context, singular, plural, pn)[pf(n)];
}

export type FormatFunc = { compiled: Compiled } & ((
    ...args: FormatArgs
) => string);

function fcompile(template: string): FormatFunc {
    const compiled = compile(template);
    const result = (...args: FormatArgs) => compiled(...args).join("");
    result.compiled = compiled;
    return result;
}

export function dpgettextf(
    domain: string,
    ...[context, message]: CMParam
): FormatFunc {
    if (en) return fcompile(message);
    return fcompile(lookup(domain, context, message));
}

export function dnpgettextf(
    domain: string,
    ...[context, singular, plural, n]: CNParam
): FormatFunc {
    if (en) return fcompile([singular, plural][pf(n)]);
    const translated = nlookup(domain, context, singular, plural, pn)[pf(n)];
    return fcompile(translated);
}

export function domain(domain: string) {
    return {
        gettext: (...args: MParam) => dpgettext(domain, "", ...args),
        gettextf: (...args: MParam) => dpgettextf(domain, "", ...args),

        pgettext: (...args: CMParam) => dpgettext(domain, ...args),
        pgettextf: (...args: CMParam) => dpgettextf(domain, ...args),

        ngettext: (...args: NParam) => dnpgettext(domain, "", ...args),
        ngettextf: (...args: NParam) => dnpgettextf(domain, "", ...args),

        npgettext: (...args: CNParam) => dnpgettext(domain, ...args),
        npgettextf: (...args: CNParam) => dnpgettextf(domain, ...args),
    };
}
