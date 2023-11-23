import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import type { ServerResponseError } from "@nextgisweb/pyramid/api";
import type { ResourceItem } from "@nextgisweb/resource/type/Resource";

export async function cloneResource({
    resourceItem,
    displayName,
    parentId,
    signal,
}: {
    resourceItem: ResourceItem;
    displayName: string;
    parentId: number;
    signal: AbortSignal;
}) {
    const { resource, resmeta, webmap, ...rest } = JSON.parse(
        JSON.stringify(resourceItem)
    );
    delete rest.social;
    delete resource.id;
    delete resource.scopes;
    delete resource.children;
    delete resource.interfaces;
    delete resource.creation_date;
    resource.keyname = null;
    resource.display_name = displayName;
    resource.parent = { id: parentId };

    const clone_ = async () => {
        try {
            const newResPayload = { resource, resmeta, webmap, ...rest };
            const cloneItem = await route("resource.collection").post<{
                id: number;
            }>({
                json: newResPayload,
                signal,
            });
            const newItemDetailUrl = routeURL("resource.update", cloneItem.id);
            window.open(newItemDetailUrl, "_self");
        } catch (err) {
            const er = err as ServerResponseError;
            const cantChangePermissions =
                er.data &&
                er.data.exception &&
                er.data.exception ===
                    "nextgisweb.core.exception.ForbiddenError";
            if (cantChangePermissions && resource.permissions) {
                // Workaround to make a copy without permission to change permissions
                delete resource.permissions;
                delete resource.owner_user;
                await clone_();
            } else {
                errorModal(err as ApiError);
            }
        }
    };
    clone_();
}
