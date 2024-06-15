import { gettext, ngettext } from "@nextgisweb/pyramid/i18n";

import type { Validator } from "./type";

const msgRequired = gettext("Value required");
const msgMinLength = (value: number) =>
    ngettext(
        "At least {} character required",
        "At least {} characters required",
        value
    );
const msgMaxLength = (value: number) =>
    ngettext(
        "No more than {} character required",
        "No more than {} characters required",
        value
    );
const msgPattern = gettext("Ivalid value");
const msgNotUnique = gettext("Value not unique");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function required<V = any>(): Validator<V> {
    return (value: V) => {
        if (value === undefined || value === null) {
            return [false, gettext(msgRequired)];
        }
        return [true, undefined];
    };
}

export function string<V = string>({
    minLength,
    maxLength,
    pattern,
}: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
}): Validator<V> {
    return (value: V) => {
        if (typeof value !== "string") return [true, undefined];
        if (minLength !== undefined && value.length < minLength) {
            const m = msgMinLength(minLength).replace("{}", String(minLength));
            return [false, m];
        }
        if (maxLength !== undefined && value.length > maxLength) {
            const m = msgMaxLength(maxLength).replace("{}", String(maxLength));
            return [false, m];
        }
        if (pattern !== undefined && !pattern.test(value))
            return [false, msgPattern];
        return [true, undefined];
    };
}

type KeyVT<O, V> = keyof {
    [P in keyof O as O[P] extends { value: V } ? P : never]: unknown;
};

export function unique<V, O, K extends KeyVT<O, V>>(
    collection: (obj: O) => O[],
    keyOrFunc: K | ((obj: O) => V)
): Validator<V, O> {
    const get =
        typeof keyOrFunc === "string"
            ? (obj: O) => (obj[keyOrFunc]! as unknown as { value: V }).value
            : (keyOrFunc as (obj: O) => V);

    return (value: V, obj: O) => {
        for (const cnd of collection(obj))
            if (cnd !== obj && get(cnd) === value) return [false, msgNotUnique];
        return [true, undefined];
    };
}
