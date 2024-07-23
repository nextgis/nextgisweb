import { lookup, nlookup } from "@nextgisweb/jsrealm/i18n/catalog";

import compile from "./string-format/compile";

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

export function dgettext(domain: string, ...[message]: MParam): string {
    return dpgettext(domain, "", message);
}

export function dgettextf(
    domain: string,
    template: string,
    ...args: MParam
): string {
    const translation = dgettext(domain, template);
    const newTemplate = compile(translation);
    return newTemplate(...args);
}

export function dnpgettext(
    domain: string,
    ...[context, singular, plural, n]: CNParam
): string {
    if (en) return [singular, plural][pf(n)];
    return nlookup(domain, context, singular, plural, pn)[pf(n)];
}

export function dngettext(domain: string, ...args: NParam): string {
    return dnpgettext(domain, "", ...args);
}

export function dngettextf(domain: string, ...args: NParam): string {
    const [singular, plural, n] = args;
    const translation = dnpgettext(domain, "", singular, plural, n);
    const newTemplate = compile(translation);
    return newTemplate(n);
}

export function domain(domain: string) {
    return {
        gettext: (...args: MParam) => dgettext(domain, ...args),
        gettextf: (template: string) => {
            return (...args: MParam) => dgettextf(domain, template, ...args);
        },
        pgettext: (...args: CMParam) => dpgettext(domain, ...args),
        ngettext: (...args: NParam) => dngettext(domain, ...args),
        ngettextf: (singular: string, plural: string, n: number) => {
            return dngettextf(domain, singular, plural, n);
        },
        npgettext: (...args: CNParam) => dnpgettext(domain, ...args),
    };
}
