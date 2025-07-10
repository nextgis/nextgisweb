import type { ResourceChildAction } from "@nextgisweb/resource/type/api";

export function isPreviewAction(action: ResourceChildAction) {
    const { key } = action;
    return Array.isArray(key) && key[1] === "preview";
}
