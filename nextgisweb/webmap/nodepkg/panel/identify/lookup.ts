import { route } from "@nextgisweb/pyramid/api";
import type { GetRequestOptions } from "@nextgisweb/pyramid/api/type";

export async function load(
    resourceId: number,
    requestOptions?: GetRequestOptions
): Promise<Record<string, string>> {
    const resourceItem = await route("resource.item", resourceId).get({
        cache: true,
        ...requestOptions,
    });
    if (resourceItem.lookup_table !== undefined) {
        return resourceItem.lookup_table.items;
    }

    throw Error(
        `An error occurred while loading the lookup table with resourceId=${resourceId}`
    );
}

export async function lookup(
    resourceId: number,
    key: string,
    requestOptions?: GetRequestOptions
) {
    const data = await load(resourceId, requestOptions);
    const value = data[key];
    if (value === undefined) {
        return null;
    }
    return value;
}
