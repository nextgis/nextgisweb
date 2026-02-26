import { route } from "@nextgisweb/pyramid/api";
import { resourceAttrItem } from "@nextgisweb/resource/api/resource-attr";
import type { Attributes } from "@nextgisweb/resource/api/resource-attr";

import { registry } from "../../registry";
import { DefaultResourceSectionAttrs } from "../../type";
import type { DefaultResourceAttrItem } from "../../type";

export async function createResourceTableItemOptions(
    resourceId: number
): Promise<DefaultResourceAttrItem> {
    const attrRoute = route("resource.attr");
    const reg = registry.queryAll();

    const attrs: [...Attributes] = [];
    for (const { attributes } of reg) {
        if (attributes) {
            attrs.push(...attributes);
        }
    }

    const item = (await resourceAttrItem({
        resource: resourceId,
        attributes: [...DefaultResourceSectionAttrs, ...attrs],
        route: attrRoute,
    })) as DefaultResourceAttrItem;

    return item;
}
