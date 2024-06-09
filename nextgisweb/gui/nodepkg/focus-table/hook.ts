import { useCallback } from "react";

import type { FocusTableAction, FocusTableActions } from "./type";

export function useActionsCallback<C, E, M>(
    source: FocusTableActions<C, E, M> | undefined,
    modifier: M
): (context: C) => FocusTableAction<C, E>[] {
    return useCallback(
        (context: C) => {
            if (typeof source === "function") {
                return source(context);
            }

            const result: FocusTableAction<C, E>[] = [];
            if (source === undefined) return result;
            for (const i of source) {
                const a = typeof i === "function" ? i(context, modifier) : [i];
                result.push(...a);
            }

            return result;
        },
        [source, modifier]
    );
}
