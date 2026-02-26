import type { RequestOptions } from "@nextgisweb/pyramid/api/type";
import type { ResourceAttrTypes } from "@nextgisweb/resource/type/api";

import type { Attributes } from "./resource-attr";
import { resourceAttrBatcher } from "./resourceAttrBatcher";
import { sameSpec, uniqAttributes } from "./util";

type AttrTuple = [keyof ResourceAttrTypes, ...unknown[]];

type AttrKeyOf<A> = A extends [infer K, ...unknown[]]
    ? K & keyof ResourceAttrTypes
    : never;

type KeysOf<A extends AttrTuple[]> = Extract<
    AttrKeyOf<A[number]>,
    `${string}.${string}`
>;

type ClsName<K extends string> = K extends `${infer P}.${string}` ? P : never;
type CompName<K extends string> = K extends `${string}.${infer N}` ? N : never;

type ObjFromKeys<K extends `${string}.${string}` & keyof ResourceAttrTypes> = {
    [P in ClsName<K>]: {
        [N in CompName<
            Extract<K, `${P}.${string}`>
        >]: ResourceAttrTypes[Extract<K, `${P}.${N}`>];
    };
};

type RequireKeys<
    A extends AttrTuple[],
    Keys extends keyof ResourceAttrTypes,
> = [Keys] extends [AttrKeyOf<A[number]>] ? unknown : never;

export type ResourceItemWithKeys<
    Keys extends keyof ResourceAttrTypes,
    A extends Attributes = Attributes,
> = ResourceAttrItem<A> & RequireKeys<A, Keys>;

export type Value<S extends Attributes[number]> = S extends [
    infer K,
    ...unknown[],
]
    ? K extends keyof ResourceAttrTypes
        ? ResourceAttrTypes[K]
        : never
    : never;

export class ResourceAttrItem<A extends Attributes = Attributes> {
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

    update(attrs: Attributes, values: unknown[]): void {
        const prepared = uniqAttributes(attrs);

        for (let i = 0; i < prepared.length; i++) {
            const spec = prepared[i];
            const v = values[i];

            const idx = this.attrs.findIndex((existing) =>
                sameSpec(existing, spec)
            );

            if (idx >= 0) {
                this.values[idx] = v;
            } else {
                this.attrs.push(spec);
                this.values.push(v);
            }
        }
    }

    async fetch<B extends [...Attributes]>(
        attributes: B,
        opt?: Pick<RequestOptions, "signal">
    ): Promise<{ [K in keyof B]: Value<B[K]> }> {
        const prepared = uniqAttributes(attributes);

        const missing = prepared.filter((spec) => !this.has(spec));
        if (missing.length) {
            const rowValues = await resourceAttrBatcher.load(
                this.id,
                missing,
                opt
            );
            this.update(missing, rowValues);
        }

        return prepared.map((spec) => this.get(...spec)) as {
            [K in keyof B]: Value<B[K]>;
        };
    }

    toObj(): ObjFromKeys<KeysOf<A>> {
        const out: any = {};

        for (const spec of this.attrs) {
            const key = spec[0];
            const [p, n] = key.split(".");
            out[p] ??= {};
            out[p][n] = this.get(...spec);
        }

        return out;
    }
}
