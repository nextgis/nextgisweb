import type { ResourceItemWithKeys } from "../api/ResourceAttrItem";
import type { Attributes } from "../api/resource-attr";

const keyname_pattern = "^[A-Za-z][\\w]*$";

export function generateResourceKeyname<A extends Attributes>(
    item: ResourceItemWithKeys<"resource.keyname" | "resource.display_name", A>
) {
    const re = new RegExp(keyname_pattern);

    let value =
        item.get("resource.keyname") || item.get("resource.display_name");

    if (re.test(value)) {
        return value;
    }
    value = value.replace(/[^\w]/g, "_");
    value = value.replace(/^_+|_+$/g, "");
    if (re.test(value)) {
        return value;
    }
    return "layer_" + item.id;
}
