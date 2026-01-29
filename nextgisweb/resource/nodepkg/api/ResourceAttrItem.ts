import { route } from "@nextgisweb/pyramid/api";
import type { RequestOptions } from "@nextgisweb/pyramid/api/type";
import type { ResourceAttrTypes } from "@nextgisweb/resource/type/api";

import { resourceAttr } from "./resource-attr";
import type { Attributes } from "./resource-attr";
import { sameSpec, uniqAttributes } from "./util";

export type Value<S extends Attributes[number]> = S extends [
    infer K,
    ...unknown[],
]
    ? K extends keyof ResourceAttrTypes
        ? ResourceAttrTypes[K] | undefined
        : never
    : never;

export class ResourceAttrItem<A extends Attributes = Attributes> {
    private route = route("resource.attr");

    constructor(
        public readonly id: number,
        private attrs: A,
        private values: unknown[]
    ) {}

    get<S extends A[number]>(...spec: S): Value<S> {
        const [key, ...args] = spec as [keyof ResourceAttrTypes, ...unknown[]];

        for (let i = 0; i < this.attrs.length; i++) {
            const [k, ...a] = this.attrs[i] as [
                keyof ResourceAttrTypes,
                ...unknown[],
            ];

            if (k === key && sameSpec(a, args)) {
                return this.values[i] as Value<S>;
            }
        }
        return undefined as Value<S>;
    }

    has(spec: Attributes[number]): boolean {
        return this.attrs.some((existing) => sameSpec(existing, spec));
    }

    async fetch<B extends [...Attributes]>(
        attributes: B,
        opt?: Pick<RequestOptions, "signal">
    ): Promise<{ [K in keyof B]: Value<B[K]> }> {
        const prepared = uniqAttributes(attributes);

        const missing = prepared.filter((spec) => !this.has(spec));
        if (missing.length) {
            const [fetchedAttrs, fetchedItems] = await resourceAttr({
                route: this.route,
                resources: [this.id],
                attributes: missing,
                signal: opt?.signal,
            });

            const row = fetchedItems.find(([id]) => id === this.id);

            if (row) {
                const [, rowValues] = row;

                const newValues = missing.map((spec) => {
                    const idx = fetchedAttrs.findIndex((a) =>
                        sameSpec(a, spec)
                    );
                    return idx >= 0 ? rowValues[idx] : undefined;
                });

                this.attrs = [...this.attrs, ...missing] as A;
                this.values = [...this.values, ...newValues];
            }
        }

        return prepared.map((spec) => this.get(...spec)) as {
            [K in keyof B]: Value<B[K]>;
        };
    }
}
