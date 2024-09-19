import { useCallback } from "react";

import { useEventListener } from "./useEventListener";

export function useKeydownListener(
    key: string,
    handlerProp: (e: KeyboardEvent) => void
) {
    const handler_ = useCallback(
        (e: KeyboardEvent) => {
            if (e.key && e.key.toLowerCase() === key.toLowerCase()) {
                handlerProp(e);
            }
        },
        [handlerProp, key]
    );
    useEventListener("keydown", handler_);
}
