import { extractError, isAbortError } from "@nextgisweb/gui/error";

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
            if (!isAbortError(err)) {
                const errorInfo = extractError(err);
                this.setError(operationName, errorInfo);
            }
        } finally {
            this.setLoading(operationName, false);
        }
    };
}
