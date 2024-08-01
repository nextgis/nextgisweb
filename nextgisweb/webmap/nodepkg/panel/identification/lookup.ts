import { route } from "@nextgisweb/pyramid/api";

const cache = new Map<number, Record<string, string>>();

export const lookup = (resourceId: number, key: string) => {
    const data = cache.get(resourceId);
    if (data === undefined || data === null) {
        return null;
    }
    const value = data[key];
    if (value === undefined) {
        return null;
    }
    return value;
};

export const load = async (
    resourceId: number
): Promise<Record<string, string>> => {
    const lookupTableItems = cache.get(resourceId);
    if (lookupTableItems !== undefined) {
        return lookupTableItems;
    }

    const resourceItem = await route("resource.item", resourceId).get();
    if (resourceItem.lookup_table !== undefined) {
        cache.set(resourceId, resourceItem.lookup_table.items);
        return resourceItem.lookup_table.items;
    }

    throw Error(
        `An error occurred while loading the lookup table with resourceId=${resourceId}`
    );
};
