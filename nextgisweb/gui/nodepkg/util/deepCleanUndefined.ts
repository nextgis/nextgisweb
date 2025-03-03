import { isObject, transform } from "lodash-es";

export function deepCleanUndefined<O>(value: O): O {
    if (isObject(value)) {
        return transform(value, (result: Record<string, unknown>, val, key) => {
            if (val !== undefined) {
                (result as any)[key] = deepCleanUndefined(val);
            }
        }) as O;
    }
    return value;
}
