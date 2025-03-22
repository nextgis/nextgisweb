import { extractError } from "@nextgisweb/gui/error";

import type { ResourcePickerStore } from "../ResourcePickerStore";

export function actionHandler(
    originalMethod: any,
    _context: ClassMethodDecoratorContext
) {
    return async function (
        this: ResourcePickerStore,
        ...args: any[]
    ): Promise<any> {
        const operationName = originalMethod.name || "operation";
        this.setLoading(operationName, true);

        try {
            const result = await originalMethod.apply(this, args);
            return result;
        } catch (err) {
            const { title } = extractError(err);
            this.setError(operationName, title);
            throw err;
        } finally {
            this.setLoading(operationName, false);
        }
    };
}
