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
const msgMinValue = gettext("Value should be at least {}");
const msgMaxValue = gettext("Value should be no more than {}");

const msgPattern = gettext("Invalid value");
const msgNotUnique = gettext("Value not unique");
const msgInvalidURL = gettext("Invalid URL");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function required<V = any>(): Validator<V> {
    return (value: V) => {
        if (value === undefined || value === null || value === "") {
            return [false, gettext(msgRequired)];
        }
        return [true, undefined];
    };
}

export function isValidURL(value: string): boolean {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

export function string<V = string>({
    minLength,
    maxLength,
    pattern,
    url,
}: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    url?: boolean;
}): Validator<V> {
    return (value: V) => {
        if (typeof value !== "string") return [true, undefined];
        if (typeof minLength === "number" && value.length < minLength) {
            const m = msgMinLength(minLength).replace("{}", String(minLength));
            return [false, m];
        }
        if (typeof maxLength === "number" && value.length > maxLength) {
            const m = msgMaxLength(maxLength).replace("{}", String(maxLength));
            return [false, m];
        }
        if (pattern !== undefined && !pattern.test(value)) {
            return [false, msgPattern];
        }
        if (url && value && !isValidURL(value)) {
            return [false, msgInvalidURL];
        }
        return [true, undefined];
    };
}

export function number<V = number>({
    min,
    max,
}: {
    min?: number;
    max?: number;
}): Validator<V> {
    return (value: V) => {
        if (typeof value !== "number") return [true, undefined];
        if (min !== undefined && value < min) {
            return [false, msgMinValue.replace("{}", String(value))];
        }
        if (max !== undefined && value > max) {
            return [false, msgMaxValue.replace("{}", String(value))];
        }
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
