import { useCallback } from "react";

import { useEventListener } from "./useEventListener";

export function useKeydownListener<T extends HTMLElement = HTMLDivElement>(
    key: string,
    handlerProp: (e: KeyboardEvent) => void,
    element?: React.RefObject<T>,
    options?: boolean | AddEventListenerOptions
) {
    const handler_ = useCallback(
        (e: KeyboardEvent) => {
            if (e.key && e.key.toLowerCase() === key.toLowerCase()) {
                handlerProp(e);
            }
        },
        [handlerProp, key]
    );

    useEventListener(
        "keydown",
        handler_,
        element as React.RefObject<T>,
        options
    );
}
