import { useEffect, useMemo, useReducer, useRef } from "react";

import { useObjectState } from "@nextgisweb/gui/hook/useObjectState";

import { route as apiRoute } from "../api";
import { useAbortController } from "./useAbortController";

import type { UseRouteParams } from "./type";

type LoadingCounterState = "increment" | "decrement" | "reset";

const loadingCounterReducer = (
    state: { count: number },
    action: LoadingCounterState | undefined
) => {
    switch (action) {
        case "increment":
            return { count: state.count + 1 };
        case "decrement":
            return { count: state.count - 1 };
        case "reset":
            return { count: 0 };
        default:
            throw new Error();
    }
};

export function useRoute(
    name: string,
    params?: UseRouteParams,
    loadOnInit = false
) {
    const loadOnInit_ = useRef(loadOnInit);
    const { abort, makeSignal } = useAbortController();
    const [loadingCounter, dispatchLoadingCounter] = useReducer(
        loadingCounterReducer,
        { count: Number(!!loadOnInit_) }
    );

    const [routerParams] = useObjectState(params);

    const route = useMemo(() => {
        const route_ = apiRoute(name, routerParams);
        abort();
        for (const method of ["get", "post", "put", "delete"]) {
            const requestForMethodCb = route_[method];
            route_[method] = async (options) => {
                if (loadOnInit_.current) {
                    dispatchLoadingCounter("decrement");
                    loadOnInit_.current = false;
                }
                dispatchLoadingCounter("increment");
                try {
                    return await requestForMethodCb({
                        signal: makeSignal(),
                        ...options,
                    });
                } finally {
                    dispatchLoadingCounter("decrement");
                }
            };
        }
        return route_;
    }, [abort, makeSignal, name, routerParams]);

    const isLoading = useMemo(() => {
        return loadingCounter.count !== 0;
    }, [loadingCounter]);

    useEffect(() => {
        return () => {
            abort();
        };
    }, [abort]);

    return { route, isLoading, abort };
}
