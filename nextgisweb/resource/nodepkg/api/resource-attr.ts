import type {
    RequestOptions,
    RouteBody,
    RouteResults,
} from "@nextgisweb/pyramid/api/type";
import type { ResourceAttrTypes } from "@nextgisweb/resource/type/api";

import { ResourceAttrItem } from "./ResourceAttrItem";
import { uniqAttributes } from "./util";

type Resources = RouteBody<"resource.attr", "post">["resources"];
export type Attributes = RouteBody<"resource.attr", "post">["attributes"];
export type Values<T extends [keyof ResourceAttrTypes, ...unknown[]][]> = {
    [K in keyof T]: T[K] extends [infer Key, ...unknown[]]
        ? Key extends keyof ResourceAttrTypes
            ? ResourceAttrTypes[Key] | undefined
            : never
        : never;
};

export interface ResourceAttrOptions<A extends [...Attributes]> extends Pick<
    RequestOptions,
    "signal"
> {
    resources: Resources;
    attributes: [...A];
    route: RouteResults<"resource.attr">;
}

export async function resourceAttr<A extends [...Attributes]>({
    resources,
    attributes,
    signal,
    route,
}: ResourceAttrOptions<A>): Promise<[[...A], [number, Values<A>][]]> {
    const preparedAttrs = uniqAttributes(attributes);
    const { items } = await route.post({
        json: { resources, attributes: preparedAttrs },
        signal,
    });
    return [
        preparedAttrs,
        items.map(([id, values]) => {
            return [id, values.map(([e, v]) => (e === 0 ? v : undefined))];
        }) as [number, Values<A>][],
    ];
}

export async function resourceAttrItems<A extends [...Attributes]>(
    options: ResourceAttrOptions<A>
): Promise<ResourceAttrItem<A>[]> {
    const [attrs, items] = await resourceAttr(options);
    return items.map(([id, normalized]) => {
        return new ResourceAttrItem(id, attrs, normalized);
    });
}
