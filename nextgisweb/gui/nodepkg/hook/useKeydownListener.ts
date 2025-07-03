import { useCallback, useState } from "react";

import { useEventListener } from "./useEventListener";

export function useKeydownListener<T extends HTMLElement = HTMLDivElement>(
    /** See all available keys here https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values */
    key: string,
    handlerProp?: (e: KeyboardEvent) => void,
    element?: React.RefObject<T>,
    options?: boolean | AddEventListenerOptions
) {
    const [isPressed, setIsPressed] = useState(false);

    const downHandler = useCallback(
        (e: KeyboardEvent) => {
            if (e.key && e.key.toLowerCase() === key.toLowerCase()) {
                setIsPressed(true);
                handlerProp?.(e);
            }
        },
        [handlerProp, key]
    );

    const upHandler = useCallback(
        (e: KeyboardEvent) => {
            if (e.key && e.key.toLowerCase() === key.toLowerCase()) {
                setIsPressed(false);
            }
        },
        [key]
    );

    useEventListener(
        "keydown",
        downHandler,
        element as React.RefObject<T>,
        options
    );

    useEventListener(
        "keyup",
        upHandler,
        element as React.RefObject<T>,
        options
    );

    return isPressed;
}
