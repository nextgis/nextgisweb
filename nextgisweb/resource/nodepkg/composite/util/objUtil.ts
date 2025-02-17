export function getValueByPath<T = unknown>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obj: Record<string, any>,
    path: string
): T | undefined {
    const keys = path.split(".");

    return keys.reduce((acc, key) => {
        if (acc === null || acc === undefined) {
            return undefined;
        }
        return acc[key];
    }, obj) as T | undefined;
}

export function setValueByPath(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obj: Record<string, any>,
    path: string,
    value: unknown
): void {
    const keys = path.split(".");
    let current = obj;

    keys.forEach((key, index) => {
        if (index === keys.length - 1) {
            current[key] = value;
        } else {
            if (!current[key] || typeof current[key] !== "object") {
                current[key] = {};
            }

            current = current[key];
        }
    });
}
