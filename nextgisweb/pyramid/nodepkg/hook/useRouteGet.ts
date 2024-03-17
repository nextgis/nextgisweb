import { useCallback, useEffect, useState } from "react";

import type { ApiError } from "@nextgisweb/gui/error/type";
import { useObjectState } from "@nextgisweb/gui/hook/useObjectState";

import type {
    GetRouteParam,
    RequestOptionsByMethod,
    ResponseType,
    RouteName,
    RouteQuery,
    RouteResp,
    ToReturn,
} from "../api/type";

import type { UseRouteGetParams } from "./type";
import { useRoute } from "./useRoute";

type ResolvedRouteResponse<
    D,
    N extends RouteName,
    RT extends ResponseType = "json",
> = RT extends "blob" ? Blob : D extends undefined ? RouteResp<N, "get"> : D;

type RequestOptions<
    N extends RouteName = RouteName,
    RT extends ResponseType = "json",
> = RequestOptionsByMethod<"get", RouteQuery<N, "get">, never, RT>;

export function useRouteGet<
    D = undefined,
    N extends RouteName = RouteName,
    RT extends ResponseType = "json",
>(
    nameOrProps: UseRouteGetParams<N, RT> | N,
    params?: GetRouteParam<N>,
    options?: RequestOptions<N, RT>,
    loadOnInit = true
) {
    let endpointName_: N;
    let params_: GetRouteParam<N> = {
        ...params,
    } as GetRouteParam<N>;
    let options_: RequestOptions<N, RT> = {
        ...options,
    };
    let loadOnInit_: boolean = loadOnInit;
    if (typeof nameOrProps === "string") {
        endpointName_ = nameOrProps;
    } else {
        endpointName_ = nameOrProps.name as N;
        params_ = {
            ...nameOrProps.params,
            ...params,
        } as GetRouteParam<N>;
        options_ = { ...nameOrProps.options, ...options };
        loadOnInit_ = nameOrProps.loadOnInit ?? loadOnInit;
    }

    const { route, abort } = useRoute<N>(endpointName_, params_);
    const [isLoading, setIsLoading] = useState(!!loadOnInit_);
    const [data, setData] = useState<ResolvedRouteResponse<D, N, RT>>();
    const [error, setError] = useState<ApiError | null>(null);

    const [routerOptions] = useObjectState(options_);

    const refresh = useCallback(async () => {
        abort();
        setError(null);
        setIsLoading(true);
        try {
            const get: <
                T = RouteResp<N, "get">,
                RT extends ResponseType = "json",
                B extends boolean = false,
            >(
                options: RequestOptionsByMethod<
                    "get",
                    RouteQuery<N, "get">,
                    never,
                    RT,
                    B
                >
            ) => Promise<ToReturn<T, RT, B>> = route.get;

            const data = await get<ResolvedRouteResponse<D, N>, RT, false>(
                routerOptions
            );
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
