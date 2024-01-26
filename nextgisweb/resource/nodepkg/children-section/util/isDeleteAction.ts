import type { ChildrenResourceAction } from "../type";

export function isDeleteAction(action: ChildrenResourceAction) {
    const { key } = action;
    return Array.isArray(key) && key[1] === "20-delete";
}
