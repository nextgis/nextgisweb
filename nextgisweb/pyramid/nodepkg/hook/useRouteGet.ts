import { useCallback, useEffect, useRef, useState } from "react";

import { errorModal, isAbortError } from "@nextgisweb/gui/error";
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
    let endpointName: N;
    let mergedParams: GetRouteParam<N>;
    let mergedOptions: RequestOptions<N, RT>;
    let shouldLoadOnInit: boolean;
    let enabled = true;

    const onError = useRef<(err: unknown) => void>(undefined);
    const showErrorModal = useRef(false);

    if (typeof nameOrProps === "string") {
        endpointName = nameOrProps;
        mergedParams = params || ({} as GetRouteParam<N>);
        mergedOptions = options || ({} as RequestOptions<N, RT>);
        shouldLoadOnInit = loadOnInit;
    } else {
        endpointName = nameOrProps.name as N;
        mergedParams = { ...nameOrProps.params, ...params } as GetRouteParam<N>;
        mergedOptions = { ...nameOrProps.options, ...options };
        shouldLoadOnInit = nameOrProps.loadOnInit ?? loadOnInit;
        enabled = nameOrProps.enabled ?? true;
        onError.current = nameOrProps.onError;
        showErrorModal.current = !!nameOrProps.showErrorModal;
    }

    const { route, abort } = useRoute<N>(endpointName, mergedParams);
    const [isLoading, setIsLoading] = useState(shouldLoadOnInit);
    const [data, setData] = useState<ResolvedRouteResponse<D, N, RT>>();
    const [error, setError] = useState<NonNullable<unknown> | null>(null);

    const [routerOptions] = useObjectState(mergedOptions);

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
        } catch (err) {
            if (isAbortError(err)) {
                setError(err!);
                if (showErrorModal.current) {
                    errorModal(err);
                }
                onError.current?.(err);
            }
        } finally {
            setIsLoading(false);
        }
    }, [abort, route, routerOptions]);

    useEffect(() => {
        if (!enabled) return;
        refresh();
    }, [refresh, enabled]);

    return { data, error, isLoading, abort, refresh };
}
