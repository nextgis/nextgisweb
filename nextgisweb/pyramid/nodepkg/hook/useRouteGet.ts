import { useCallback, useEffect, useState } from "react";

import { useObjectState } from "@nextgisweb/gui/hook/useObjectState";

import { useRoute } from "./useRoute";

import type { ApiError } from "@nextgisweb/gui/error/type";
import type { RequestOptions, RouteName } from "../api/type";
import type { RouteParameters } from "../api/route.inc";

interface RouterGet<D> {
    data?: D;
    error: ApiError | null;
    isLoading: boolean;
    abort: () => void;
    refresh: () => void;
}

export interface UseRouteGetParams<N extends RouteName> {
    name: N;
    params?: RouteParameters[N];
    options?: RequestOptions;
    loadOnInit?: boolean;
}

export function useRouteGet<D, N extends RouteName = RouteName>(
    nameOrProps: UseRouteGetParams<N> | N,
    params?: RouteParameters[N],
    options?: RequestOptions,
    loadOnInit = true
): RouterGet<D> {
    let endpointName_: N;
    let params_: RouteParameters[N] = {
        ...(params || {}),
    } as RouteParameters[N];
    let options_: RequestOptions = { ...options };
    let loadOnInit_: boolean = loadOnInit;
    if (typeof nameOrProps === "string") {
        endpointName_ = nameOrProps;
    } else {
        endpointName_ = nameOrProps.name;
        params_ = {
            ...(nameOrProps.params || {}),
            ...(params || {}),
        } as RouteParameters[N];
        options_ = { ...nameOrProps.options, ...options };
        loadOnInit_ = nameOrProps.loadOnInit ?? loadOnInit;
    }

    const { route, abort } = useRoute<N>(endpointName_, params_, loadOnInit_);
    const [isLoading, setIsLoading] = useState(!!loadOnInit_);
    const [data, setData] = useState<D>();
    const [error, setError] = useState<ApiError | null>(null);

    const [routerOptions] = useObjectState(options_);

    const refresh = useCallback(async () => {
        abort();
        setError(null);
        setIsLoading(true);
        try {
            const data = await route.get<D>(routerOptions);
            setData(data);
        } catch (er) {
            setError(er as ApiError);
        } finally {
            setIsLoading(false);
        }
    }, [abort, route, routerOptions]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { data, error, isLoading, abort, refresh };
}
