/* eslint-disable @typescript-eslint/no-explicit-any */
import isEqual from "lodash-es/isEqual";

import { deepCleanUndefined } from "./deepCleanUndefined";

/**
 * Compares two objects for equality, ignoring properties with the value of undefined.
 * Useful for comparing objects that might have been transformed from JSON, as JSON doesn't support undefined.
 */
export function isEqualJSON(obj1: any, obj2: any): boolean {
    return isEqual(deepCleanUndefined(obj1), deepCleanUndefined(obj2));
}
