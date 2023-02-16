import { useEffect, useRef } from "react";

export function useAbortController() {
    const controllers = useRef([]);

    const makeSignal = () => {
        const abortController = new AbortController();
        controllers.current = [...controllers.current, abortController];
        return abortController.signal;
    };

    const abort = () => {
        for (const a of controllers.current) {
            a.abort();
        }
        controllers.current = [];
    };

    useEffect(() => {
        return () => {
            abort();
        };
    }, []);

    return { makeSignal, abort };
}
