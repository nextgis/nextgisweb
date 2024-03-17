import { useEffect, useMemo, useReducer } from "react";

import { useObjectState } from "@nextgisweb/gui/hook/useObjectState";

import { route as apiRoute } from "../api";
import type {
    GetRouteParam,
    RouteName,
    RouteParameters,
    RouteResults,
} from "../api/type";

import { useAbortController } from "./useAbortController";

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

function apiRouteOverloaded<N extends RouteName>(
    name: N,
    obj?: GetRouteParam<N>
): RouteResults<N>;

function apiRouteOverloaded<N extends RouteName>(
    name: N,
    ...rest: RouteParameters[N]
): RouteResults<N> {
    return apiRoute(name, ...rest);
}

export function useRoute<N extends RouteName>(
    name: N,
    params?: GetRouteParam<N>
) {
    const { abort, makeSignal } = useAbortController();
    const [loadingCounter, dispatchLoadingCounter] = useReducer(
        loadingCounterReducer,
        { count: 0 }
    );

    const [routerParams] = useObjectState(params);

    const route = useMemo(() => {
        const apiResults = apiRouteOverloaded(name, routerParams);
        abort();
        const overloadedResults = {} as RouteResults<N>;

        Object.keys(apiResults).forEach((m) => {
            const method = m as keyof RouteResults<N>;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const originalMethod: (...args: any[]) => unknown =
                apiResults[method];
            const overloadedMethod = async (
                requestOptions: Record<string, unknown>
            ) => {
                dispatchLoadingCounter("increment");
                try {
                    return originalMethod({
                        signal: makeSignal(),
                        ...requestOptions,
                    });
                } finally {
                    dispatchLoadingCounter("decrement");
                }
            };
            // Using 'unknown' for type assertion because all methods are actually written to 'result'
            (overloadedResults[method] as unknown) = overloadedMethod;
        });

        return overloadedResults;
    }, [abort, makeSignal, name, routerParams]);

    const isLoading = useMemo(() => {
        return loadingCounter.count !== 0;
    }, [loadingCounter]);

    useEffect(() => {
        return abort;
    }, [abort]);

    return { route, isLoading, abort };
}
