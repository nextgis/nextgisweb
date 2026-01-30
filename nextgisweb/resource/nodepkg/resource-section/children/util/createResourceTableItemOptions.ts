import { assert } from "@nextgisweb/jsrealm/error";
import { route } from "@nextgisweb/pyramid/api";
import type { ResourceAttrItem } from "@nextgisweb/resource/api/ResourceAttrItem";
import { resourceAttrItems } from "@nextgisweb/resource/api/resource-attr";
import type { Attributes } from "@nextgisweb/resource/api/resource-attr";
import type { ResourceRead } from "@nextgisweb/resource/type/api";

import { DefaultAttributes } from "../ResourceSectionChildren";
import { registry } from "../../registry";
import type { ChildrenResource } from "../type";

export async function createResourceTableItemOptions(
    resource: ResourceRead
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
        resources: [resource.id],
        attributes: [...DefaultAttributes, ...attrs],
        route: attrRoute,
    });

    const it = items[0];

    assert(it);

    return {
        cls: "resource_group",
        displayName: resource.display_name,
        id: resource.id,
        it: it as ResourceAttrItem<typeof DefaultAttributes>,
    };
}
