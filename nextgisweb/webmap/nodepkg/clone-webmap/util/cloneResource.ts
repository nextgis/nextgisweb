import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { route } from "@nextgisweb/pyramid/api";
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

    // Doesn't work
    delete rest.social;

    // Read-only
    delete resource.id;
    delete resource.scopes;
    delete resource.children;
    delete resource.interfaces;
    delete resource.creation_date;

    // Security
    delete resource.owner_user;
    delete resource.permissions;

    // Update
    resource.keyname = null;
    resource.display_name = displayName;
    resource.parent = { id: parentId };

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
        errorModal(err as ApiError);
    }
}
