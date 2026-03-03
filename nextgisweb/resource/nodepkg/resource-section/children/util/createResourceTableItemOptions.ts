import { assert } from "@nextgisweb/jsrealm/error";
import { route } from "@nextgisweb/pyramid/api";
import type { ResourceAttrItem } from "@nextgisweb/resource/api/ResourceAttrItem";
import { resourceAttrItems } from "@nextgisweb/resource/api/resource-attr";
import type { Attributes } from "@nextgisweb/resource/api/resource-attr";

import { registry } from "../../registry";
import { DefaultAttributes } from "../ResourceSectionChildren";
import type { ChildrenResource } from "../type";

export async function createResourceTableItemOptions(
    resourceId: number
): Promise<ChildrenResource> {
    const attrRoute = route("resource.attr");
    const reg = registry.queryAll();

    const attrs: [...Attributes] = [];
    for (const { attributes } of reg) {
        if (attributes) {
            attrs.push(...attributes);
        }
    }

    const items = await resourceAttrItems({
        resources: [resourceId],
        attributes: [...DefaultAttributes, ...attrs],
        route: attrRoute,
    });

    const it = items[0];

    assert(it);

    const displayName = it.get("resource.display_name");
    assert(displayName);

    return {
        cls: "resource_group",
        displayName,
        id: it.id,
        it: it as ResourceAttrItem<typeof DefaultAttributes>,
    };
}
