import { useCallback, useEffect, useState } from "react";

import type { ApiError } from "@nextgisweb/gui/error/type";
import { useObjectState } from "@nextgisweb/gui/hook/useObjectState";

import type { GetRouteParam, RequestOptions, RouteName } from "../api/type";

import type { UseRouteGetParams } from "./type";
import { useRoute } from "./useRoute";

export function useRouteGet<D = unknown>(
    nameOrProps: UseRouteGetParams | RouteName,
    params?: GetRouteParam<RouteName>,
    options?: RequestOptions,
    loadOnInit = true
) {
    let endpointName_: RouteName;
    let params_: GetRouteParam<RouteName> = {
        ...params,
    } as GetRouteParam<RouteName>;
    let options_: RequestOptions = { ...options };
    let loadOnInit_: boolean = loadOnInit;
    if (typeof nameOrProps === "string") {
        endpointName_ = nameOrProps;
    } else {
        endpointName_ = nameOrProps.name;
        params_ = {
            ...nameOrProps.params,
            ...params,
        } as GetRouteParam<RouteName>;
        options_ = { ...nameOrProps.options, ...options };
        loadOnInit_ = nameOrProps.loadOnInit ?? loadOnInit;
    }

    const { route, abort } = useRoute(endpointName_, params_, loadOnInit_);
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
