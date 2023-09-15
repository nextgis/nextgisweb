import isObject from "lodash-es/isObject";
import transform from "lodash-es/transform";

export function deepCleanUndefined<O>(value: O): O {
    if (isObject(value)) {
        return transform(value, (result: Record<string, unknown>, val, key) => {
            if (val !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (result as any)[key] = deepCleanUndefined(val);
            }
        }) as O;
    }
    return value;
}
