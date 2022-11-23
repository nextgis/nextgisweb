import { useEffect, useState, useCallback } from "react";

import { useRoute } from "./useRoute";

export function useRouteGet(nameOrProps, params = {}, options = {}) {
    let endpointName = "";

    if (typeof nameOrProps === "string") {
        endpointName = nameOrProps;
    } else {
        endpointName = nameOrProps.name;
        params = { ...nameOrProps.params, ...params };
        options = { ...nameOrProps.options, ...options };
    }

    params = { loadOnInit: true, ...params };
    const { route, abort } = useRoute(endpointName, params);
    const [isLoading, setIsLoading] = useState(!!params.loadOnInit);
    const [data, setData] = useState();
    const [error, setError] = useState();

    const refresh = useCallback(async () => {
        abort();
        setIsLoading(true);
        try {
            const data = await route.get(options);
            setData(data);
        } catch (er) {
            setError(er);
        } finally {
            setIsLoading(false);
        }
    }, [abort, options, route]);

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { data, error, isLoading, abort, refresh };
}
