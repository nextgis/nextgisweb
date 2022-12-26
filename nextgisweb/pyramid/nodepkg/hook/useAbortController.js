import { useEffect, useReducer, useCallback } from "react";

function reducer(state, action) {
    switch (action.type) {
        case "add":
            return [...state, action.controller];
        case "clean":
            for (const a of state) {
                a.abort();
            }
            return [];
        default:
            throw new Error();
    }
}

export function useAbortController() {
    const [controllers, dispatch] = useReducer(reducer, []);

    const makeSignal = useCallback(() => {
        const controller = new AbortController();
        dispatch({ type: "add", controller });
        return controller.signal;
    }, []);

    const abort = useCallback(() => {
        for (const a of controllers) {
            a.abort();
        }
        dispatch({ type: "clean" });
    }, [controllers]);

    useEffect(() => {
        return () => {
            dispatch({ type: "clean" });
        };
    }, []);

    return { makeSignal, abort };
}
