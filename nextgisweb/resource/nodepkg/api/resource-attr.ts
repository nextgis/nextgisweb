import type { RouteBody, RouteResults } from "@nextgisweb/pyramid/api/type";
import type { ResourceAttrTypes } from "@nextgisweb/resource/type/api";

type Resources = RouteBody<"resource.attr", "post">["resources"];
type Attributes = RouteBody<"resource.attr", "post">["attributes"];
type Values<T extends [keyof ResourceAttrTypes, ...unknown[]][]> = {
    [K in keyof T]: T[K] extends [infer Key, ...unknown[]]
        ? Key extends keyof ResourceAttrTypes
            ? ResourceAttrTypes[Key] | undefined
            : never
        : never;
};

interface resourceAttrOptions<A extends [...Attributes]> {
    resources: Resources;
    attributes: [...A];
    route: RouteResults<"resource.attr">;
}

export async function resourceAttr<A extends [...Attributes]>({
    resources,
    attributes,
    route,
}: resourceAttrOptions<A>): Promise<[number, Values<A>][]> {
    const { items } = await route.post({ json: { resources, attributes } });
    return items.map(([id, values]) => {
        return [id, values.map(([e, v]) => (e === 0 ? v : undefined))];
    }) as [number, Values<A>][];
}
