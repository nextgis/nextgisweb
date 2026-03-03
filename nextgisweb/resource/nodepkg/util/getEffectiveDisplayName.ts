import type { ResourceItemWithKeys } from "../api/ResourceAttrItem";
import { resourceAttrItem } from "../api/resource-attr";
import type { Attributes } from "../api/resource-attr";

export async function getEffectiveDisplayName<A extends Attributes>(
    item: ResourceItemWithKeys<
        "resource.display_name" | "resource.parent" | "resource.cls",
        A
    >,
    opt?: { signal?: AbortSignal }
): Promise<string> {
    const parent = item.get("resource.parent");
    let displayName = item.get("resource.display_name");
    if (item.get("resource.cls").endsWith("_style") && parent) {
        const parentItem = await resourceAttrItem({
            resource: parent.id,
            attributes: [["resource.display_name"]],
            signal: opt?.signal,
        });
        if (parentItem) {
            displayName = parentItem.get("resource.display_name");
        }
    }
    return displayName;
}
