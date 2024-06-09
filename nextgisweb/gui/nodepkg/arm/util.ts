import type { ErrorResult } from "./type";

export function firstError(
    ...args: ({ error: ErrorResult } | (() => ErrorResult))[]
): ErrorResult {
    for (const itm of args) {
        let result;
        if ("error" in itm) {
            result = itm.error;
        } else {
            result = itm();
        }
        if (result !== false) return result;
    }
    return false;
}
