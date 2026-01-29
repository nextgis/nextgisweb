import type { Attributes } from "./resource-attr";

export function sameSpec(a: unknown[], b: unknown[]) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export function uniqAttributes<A extends [...Attributes]>(attrs: A): A {
    const out: Attributes = [];

    for (const spec of attrs) {
        const exists = out.some((existing) => sameSpec(existing, spec));
        if (!exists) out.push(spec);
    }

    return out as A;
}
