import { route } from "@nextgisweb/pyramid/api";
import { cache } from "@nextgisweb/pyramid/api/cache";
import type {
    RequestOptions,
    RouteBody,
    RouteResults,
} from "@nextgisweb/pyramid/api/type";
import { LoaderCache } from "@nextgisweb/pyramid/util";
import type { ResourceAttrTypes } from "@nextgisweb/resource/type/api";

import { ResourceAttrItem } from "./ResourceAttrItem";
import { normalize, uniqAttributes } from "./util";

type Resources = RouteBody<"resource.attr", "post">["resources"];
export type Attributes = RouteBody<"resource.attr", "post">["attributes"];
export type Values<T extends [keyof ResourceAttrTypes, ...unknown[]][]> = {
    [K in keyof T]: T[K] extends [infer Key, ...unknown[]]
        ? Key extends keyof ResourceAttrTypes
            ? ResourceAttrTypes[Key]
            : never
        : never;
};

export interface ResourceAttrOptions<A extends [...Attributes]> extends Pick<
    RequestOptions,
    "signal" | "cache"
> {
    resources: Resources;
    attributes: [...A];
    route?: RouteResults<"resource.attr">;
}

export async function resourceAttrItems<A extends [...Attributes]>({
    attributes,
    resources,
    signal,
    cache: cacheProp,
    route: routeProp,
}: ResourceAttrOptions<A>): Promise<ResourceAttrItem<A>[]> {
    routeProp = routeProp ?? route("resource.attr");

    const preparedAttrs = uniqAttributes(attributes);

    const useCache = (
        cacheProp
            ? cacheProp instanceof LoaderCache
                ? cacheProp
                : cache
            : false
    ) as LoaderCache<ResourceAttrItem<A>, [...A]>;

    if (!useCache || !Array.isArray(resources)) {
        const { items } = await routeProp.post({
            json: { resources, attributes: preparedAttrs },
            signal,
            cache: useCache,
        });

        const resItems: ResourceAttrItem<A>[] = [];

        for (const [id, values] of items) {
            const normalized = normalize(values);
            if (useCache) {
                const item = await useCache.get(String(id)).loader;
                if (item) {
                    item.update(preparedAttrs, normalized);
                    resItems.push(item);
                } else {
                    const newItem = new ResourceAttrItem(
                        id,
                        preparedAttrs,
                        normalized
                    );
                    useCache.promiseFor(String(id), async () => newItem);
                    resItems.push(newItem);
                }
            } else {
                resItems.push(
                    new ResourceAttrItem(id, preparedAttrs, normalized)
                );
            }
        }

        return resItems;
    }

    const toFetch: number[] = [];
    for (const id of resources) {
        if (!useCache.has(String(id))) {
            toFetch.push(id);
        }
    }

    if (toFetch.length) {
        const fetchPromise = routeProp.post({
            json: { resources: toFetch, attributes: preparedAttrs },
            signal,
            cache: useCache,
        });

        for (const id of toFetch) {
            useCache.promiseFor(String(id), async () => {
                const { items } = await fetchPromise;
                const row = items.find(([rid]) => rid === id);
                const values = row
                    ? normalize(row[1])
                    : preparedAttrs.map(() => undefined);

                return new ResourceAttrItem(id, preparedAttrs, values);
            });
        }

        await fetchPromise;
    }

    const outItems: ResourceAttrItem<A>[] = [];
    for (const id of resources) {
        const item = await useCache.resolve(String(id));
        await item.fetch(preparedAttrs);
        outItems.push(item);
    }

    return outItems;
}

export type ResourceAttrItemOptions<A extends [...Attributes]> = Omit<
    ResourceAttrOptions<A>,
    "resources"
> & { resource: number };

export async function resourceAttrItem<A extends [...Attributes]>({
    resource,
    ...rest
}: ResourceAttrItemOptions<A>): Promise<ResourceAttrItem<A>> {
    const items = await resourceAttrItems({
        resources: [resource],
        ...rest,
    });

    return items[0];
}
