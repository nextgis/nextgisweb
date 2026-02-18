import type { ResourceAttrResponseItem } from "@nextgisweb/resource/type/api";

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

export type ResourceAttrResponseItemValues = ResourceAttrResponseItem[1];

export function normalize(values: ResourceAttrResponseItemValues): unknown[] {
    return values.map(([e, v]) => (e === 0 ? v : undefined));
}

export function sortAttrs(attributes: [...Attributes]) {
    return [...attributes].sort((a, b) => {
        const ak = a[0];
        const bk = b[0];
        return ak < bk ? -1 : ak > bk ? 1 : 0;
    });
}

export function attrsKey(attributes: [...Attributes]): string {
    return sortAttrs(attributes).flat().join();
}
