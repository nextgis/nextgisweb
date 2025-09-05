import { debounce } from "lodash-es";
import type { DebounceSettings } from "lodash-es";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

export function useDebounce<T extends any[]>(
    callback: (...args: T) => void,
    delay: number = 10,
    options?: DebounceSettings
) {
    const callbackRef = useRef(callback as (...args: T) => void);

    useLayoutEffect(() => {
        callbackRef.current = callback as (...args: T) => void;
    }, [callback]);

    const debounced = useMemo(() => {
        const fn = (...args: T) => callbackRef.current(...args);
        return debounce(fn, delay, options);
    }, [delay, options]);

    useEffect(() => {
        return () => {
            debounced.cancel();
        };
    }, [debounced]);

    return debounced;
}
