import { useCallback, useEffect, useState } from "react";

import { useObjectState } from "@nextgisweb/gui/hook/useObjectState";

import { useRoute } from "./useRoute";

import type { GetQueryOptions } from "../api/type";
import type { UseRouteGetParams, UseRouteParams } from "./type";

export function useRouteGet<D = unknown>(
    nameOrProps: UseRouteGetParams | string,
    params?: UseRouteParams,
    options?: GetQueryOptions,
    loadOnInit = true
) {
    let endpointName_ = "";
    let params_: UseRouteParams = { ...params };
    let options_: GetQueryOptions = { ...options };
    let loadOnInit_: boolean = loadOnInit;
    if (typeof nameOrProps === "string") {
        endpointName_ = nameOrProps;
    } else {
        endpointName_ = nameOrProps.name;
        params_ = { ...nameOrProps.params, ...params };
        options_ = { ...nameOrProps.options, ...options };
        loadOnInit_ = nameOrProps.loadOnInit ?? loadOnInit;
    }

    const { route, abort } = useRoute(endpointName_, params_, loadOnInit_);
    const [isLoading, setIsLoading] = useState(!!loadOnInit_);
    const [data, setData] = useState<D>();
    const [error, setError] = useState(null);

    const [routerOptions] = useObjectState(options_);

    const refresh = useCallback(async () => {
        abort();
        setError(null);
        setIsLoading(true);
        try {
            const data = await route.get(routerOptions);
            setData(data);
        } catch (er) {
            setError(er);
        } finally {
            setIsLoading(false);
        }
    }, [abort, route, routerOptions]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { data, error, isLoading, abort, refresh };
}
