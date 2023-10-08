// based on https://github.com/juliencrn/usehooks-ts/blob/master/packages/usehooks-ts/src/useEventListener/useEventListener.ts
import { useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

type Handler<
    KW extends keyof WindowEventMap,
    KH extends keyof HTMLElementEventMap,
    KM extends keyof MediaQueryListEventMap,
> = (
    event:
        | WindowEventMap[KW]
        | HTMLElementEventMap[KH]
        | MediaQueryListEventMap[KM]
        | Event
) => void;

export function useEventListener<K extends keyof MediaQueryListEventMap>(
    eventName: K,
    handler: (event: MediaQueryListEventMap[K]) => void,
    element: RefObject<MediaQueryList>,
    options?: boolean | AddEventListenerOptions
): void;

// Window Event based useEventListener interface
export function useEventListener<K extends keyof WindowEventMap>(
    eventName: K,
    handler: (event: WindowEventMap[K]) => void,
    element?: undefined,
    options?: boolean | AddEventListenerOptions
): void;

// Element Event based useEventListener interface
export function useEventListener<
    K extends keyof HTMLElementEventMap,
    T extends HTMLElement = HTMLDivElement,
>(
    eventName: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    element: RefObject<T>,
    options?: boolean | AddEventListenerOptions
): void;

// Document Event based useEventListener interface
export function useEventListener<K extends keyof DocumentEventMap>(
    eventName: K,
    handler: (event: DocumentEventMap[K]) => void,
    element: RefObject<Document>,
    options?: boolean | AddEventListenerOptions
): void;

export function useEventListener<
    KW extends keyof WindowEventMap,
    KH extends keyof HTMLElementEventMap,
    KM extends keyof MediaQueryListEventMap,
    T extends HTMLElement | MediaQueryList | void = void,
>(
    eventName: KW | KH | KM,
    handler: (
        event:
            | WindowEventMap[KW]
            | HTMLElementEventMap[KH]
            | MediaQueryListEventMap[KM]
            | Event
    ) => void,
    element?: RefObject<T>,
    options?: boolean | AddEventListenerOptions
): void {
    const savedHandler = useRef<Handler<KW, KH, KM>>();

    useLayoutEffect(() => {
        savedHandler.current = handler;
    }, [handler]);

    useEffect(() => {
        const targetElement: T | Window = element?.current ?? window;

        if (!(targetElement && targetElement.addEventListener)) return;

        const listener: typeof handler = (event) => {
            savedHandler.current!(event);
        };

        targetElement.addEventListener(eventName, listener, options);

        return () => {
            targetElement.removeEventListener(eventName, listener, options);
        };
    }, [eventName, element, options]);
}
