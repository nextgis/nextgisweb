import { route } from "@nextgisweb/pyramid/api";
import type { ResourceAttrItem } from "@nextgisweb/resource/api/ResourceAttrItem";
import { resources } from "@nextgisweb/resource/blueprint";

import type { DefaultAttributes } from "../ResourceSectionChildren";
import type { ChildrenResource } from "../type";

export async function prepareResourceChildren({
    items,
    signal,
}: {
    items: ResourceAttrItem<typeof DefaultAttributes>[];
    signal: AbortSignal;
}) {
    const userNames = new Map<number, string | undefined>();

    for (const it of items) {
        const userId = it.get("resource.owner_user");
        if (userId !== undefined) {
            userNames.set(userId.id, undefined);
        }
    }

    await Promise.all(
        [...userNames.keys()].map(async (id) => {
            const user = await route("auth.user.item", { id }).get({
                cache: true,
                query: { brief: true },
                signal,
            });
            userNames.set(id, user.display_name);
        })
    );

    const children: ChildrenResource[] = [];
    for (const it of items) {
        const cls = it.get("resource.cls");
        const displayName = it.get("resource.display_name");
        const ownerUser = it.get("resource.owner_user");
        const creationDate = it.get("resource.creation_date");

        if (!cls || !displayName) continue;
        const item: ChildrenResource = {
            id: it.id,
            cls,
            displayName,
            creationDate,
            clsDisplayName: resources[cls]?.label,
            ownerUserDisplayName:
                ownerUser !== undefined
                    ? userNames.get(ownerUser.id)
                    : `#${ownerUser}`,
            it,
        };
        children.push(item);
    }
    children.sort((a, b) => {
        const orderA = resources[a.cls]?.order ?? 0;
        const orderB = resources[b.cls]?.order ?? 0;

        if (orderA !== orderB) {
            return orderA - orderB;
        }

        return a.displayName.localeCompare(b.displayName);
    });

    return children;
}
