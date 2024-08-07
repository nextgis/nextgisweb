import { useEffect, useRef } from "react";

export function usePrevious<T>(value: T, initialValue?: T) {
    const ref = useRef(initialValue || value);
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}
