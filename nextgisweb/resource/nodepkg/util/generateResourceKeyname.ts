import type { Resource } from "../type";

const keyname_pattern = "^[A-Za-z][\\w]*$";

export function generateResourceKeyname(item: Resource) {
    const re = new RegExp(keyname_pattern);
    let value = item.keyname || item.display_name;
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
