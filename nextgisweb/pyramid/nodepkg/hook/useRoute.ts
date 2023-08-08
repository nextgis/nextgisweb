import { useEffect, useMemo, useReducer, useRef } from "react";

import { useObjectState } from "@nextgisweb/gui/hook/useObjectState";

import { route as apiRoute } from "../api";
import { useAbortController } from "./useAbortController";

import type { RequestMethod, RouteName } from "../api/type";
import type { RouteParameters } from "../api/route.inc";

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

// function apiRouteOverloaded<N extends RouteName>(
//     name: N,
//     obj?: SingleArgRoute<N>
// ): RouteResults;

// function apiRouteOverloaded<N extends RouteName>(
//     name: N,
//     ...rest: MultiArgRoute<N>
// ): RouteResults {
//     return apiRoute(name, ...rest);
// }

export function useRoute<N extends RouteName>(
    name: N,
    params?: RouteParameters[N],
    loadOnInit = false
) {
    const loadOnInit_ = useRef(loadOnInit);
    const { abort, makeSignal } = useAbortController();
    const [loadingCounter, dispatchLoadingCounter] = useReducer(
        loadingCounterReducer,
        { count: Number(!!loadOnInit_) }
    );

    const [routerParams] = useObjectState(params as RouteParameters[N]);

    const route = useMemo(() => {
        const result = apiRoute(name, routerParams);
        abort();
        const methods: RequestMethod[] = ["get", "post", "put", "delete"];
        for (const method of methods) {
            const requestForMethodCb = result[method];
            result[method] = async (options) => {
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
        return result;
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
