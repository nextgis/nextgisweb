import { useEffect, useReducer, useMemo } from "react";
import { route as apiRoute } from "../api";

const loadingCounterReducer = (state, action) => {
    switch (action) {
        case "increment":
            return {count:state.count + 1};
        case "decrement":
            return {count: state.count - 1};
        case "reset":
            return {count: 0};
        default:
            throw new Error();
    }
};

export function useRoute(name, params = {}) {
    const [abortController, dispatchAbortController] = useReducer(
        (state, action) => {
            if (action === "abort" && state) {
                state.abort();
                return null;
            } else {
                return new AbortController();
            }
        },
        null
    );
    const [loadingCounter, dispatchLoadingCounter] = useReducer(
        loadingCounterReducer,
        {count: 0}
    );

    const route = useMemo(() => {
        const route_ = apiRoute(name, params);
        dispatchAbortController();
        for (const method of ["get", "post", "put", "delete"]) {
            const requestForMethodCb = route_[method];
            route_[method] = async (options) => {
                dispatchLoadingCounter("increment");
                try {
                    return requestForMethodCb({ signal: abortController, ...options });
                } finally {
                    dispatchLoadingCounter("decrement");
                }
            };
        }
        return route_;
    }, [name]);

    const isLoading = useMemo(() => {
        return loadingCounter.count !== 0;
    }, [loadingCounter]);

    useEffect(() => {
        return () => {
            abort();
        };
    }, []);

    const abort = () => {
        dispatchAbortController("abort");
    };

    return { route, isLoading, abort };
}
