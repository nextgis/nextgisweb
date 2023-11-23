import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { route } from "@nextgisweb/pyramid/api";
import type { ServerResponseError } from "@nextgisweb/pyramid/api";
import type {
    ResourceItem,
    ResourceItemCreationResponse,
} from "@nextgisweb/resource/type/Resource";

interface CloneResourceOptions {
    resourceItem: ResourceItem;
    displayName: string;
    parentId: number;
    signal: AbortSignal;
}

export async function cloneResource({
    resourceItem,
    displayName,
    parentId,
    signal,
}: CloneResourceOptions) {
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

    const clone = async (): Promise<
        ResourceItemCreationResponse | undefined
    > => {
        try {
            const newResPayload = { resource, resmeta, webmap, ...rest };
            const cloneItem = await route(
                "resource.collection"
            ).post<ResourceItemCreationResponse>({
                json: newResPayload,
                signal,
            });
            return cloneItem;
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
                return await clone();
            } else {
                errorModal(err as ApiError);
            }
        }
    };
    return clone();
}
