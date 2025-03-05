import { extractError } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";

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
        } catch (er) {
            const { title } = extractError(er as ApiError);
            this.setError(operationName, title);
            throw er;
        } finally {
            this.setLoading(operationName, false);
        }
    };
}
