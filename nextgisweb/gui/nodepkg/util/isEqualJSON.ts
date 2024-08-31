import { isEqual } from "lodash-es";

import { deepCleanUndefined } from "./deepCleanUndefined";

/**
 * Compares two objects for equality, ignoring properties with the value of undefined.
 * Useful for comparing objects that might have been transformed from JSON, as JSON doesn't support undefined.
 */
export function isEqualJSON(obj1: unknown, obj2: unknown): boolean {
    return isEqual(deepCleanUndefined(obj1), deepCleanUndefined(obj2));
}
