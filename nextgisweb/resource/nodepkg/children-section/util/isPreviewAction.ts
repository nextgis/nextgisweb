import type { ChildrenResourceAction } from "../type";

export function isPreviewAction(action: ChildrenResourceAction) {
    const { key } = action;
    return Array.isArray(key) && key[1] === "preview";
}
