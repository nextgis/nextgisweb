import type { ResourceChildAction } from "@nextgisweb/resource/type/api";

export function isDeleteAction(action: ResourceChildAction) {
    const { key } = action;
    return Array.isArray(key) && key[1] === "20-delete";
}
