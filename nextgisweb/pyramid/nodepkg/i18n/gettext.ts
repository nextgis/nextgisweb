import { lookup, nlookup } from "@nextgisweb/jsrealm/i18n/catalog";

// import compile from "./string-format/compile";
// import compileRE from "./string-format/complileRE";
import compileREJ from "./string-format/complileREJ";

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

export function dpgettextf(
    domain: string,
    context: string,
    message: string,
    ...params: MParam
): string {
    if (en) {
        const translation = message;
        const newTemplate = compileREJ(translation);
        return newTemplate(...params);
    }

    const translation = lookup(domain, context, message);
    const newTemplate = compileREJ(translation);
    return newTemplate(...params);
}

export function dgettext(domain: string, ...[message]: MParam): string {
    return dpgettext(domain, "", message);
}

export function dgettextf(
    domain: string,
    template: string,
    ...args: MParam | [object]
): string {
    const translation = dgettext(domain, template);
    const newTemplate = compileREJ(translation);
    return newTemplate(...args);
}

export function dnpgettext(
    domain: string,
    ...[context, singular, plural, n]: CNParam
): string {
    if (en) return [singular, plural][pf(n)];
    return nlookup(domain, context, singular, plural, pn)[pf(n)];
}

export function dnpgettextf(
    domain: string,
    context: string,
    singular: string,
    plural: string,
    n: number,
    ...params: [message: string | number]
): string {
    if (en) {
        const translation = [singular, plural][pf(n)];
        const newTemplate = compileREJ(translation);
        return newTemplate(...params);
    }

    const translation = nlookup(domain, context, singular, plural, pn)[pf(n)];
    const newTemplate = compileREJ(translation);
    return newTemplate(...params);
}

export function dngettext(domain: string, ...args: NParam): string {
    return dnpgettext(domain, "", ...args);
}

export function dngettextf(
    domain: string,
    singular: string,
    plural: string,
    n: number,
    ...params: [message: string | number]
): string {
    const translation = dnpgettext(domain, "", singular, plural, n);
    const newTemplate = compileREJ(translation);
    return newTemplate(...params);
}

export function domain(domain: string) {
    return {
        gettext: (...args: MParam) => dgettext(domain, ...args),
        gettextf: (template: string) => {
            return (...params: MParam) =>
                dgettextf(domain, template, ...params);
        },

        pgettext: (...args: CMParam) => dpgettext(domain, ...args),
        pgettextf: (context: string, message: string) => {
            return (...params: MParam) =>
                dpgettextf(domain, context, message, ...params);
        },

        ngettext: (...args: NParam) => dngettext(domain, ...args),
        ngettextf: (singular: string, plural: string, n: number) => {
            return (...params: [message: string | number]) =>
                dngettextf(domain, singular, plural, n, ...params);
        },

        npgettext: (...args: CNParam) => dnpgettext(domain, ...args),
        npgettextf: (
            context: string,
            singular: string,
            plural: string,
            n: number
        ) => {
            return (...params: [message: string | number]) =>
                dnpgettextf(domain, context, singular, plural, n, ...params);
        },
    };
}
