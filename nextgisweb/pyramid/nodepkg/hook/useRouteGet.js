import { useEffect, useState } from "react";
import { useRoute } from "./useRoute";

export function useRouteGet({ name, params = {}, options = {} }) {
    params =  { loadOnInit: true, ...params };
    const { route, abort } = useRoute(name, params);
    const [isLoading, setIsLoading] = useState(!!params.loadOnInit);
    const [data, setData] = useState();
    const [error, setError] = useState();

    const refresh = async () => {
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
    };

    useEffect(() => {
        refresh();
    }, []);

    return { data, error, isLoading, abort, refresh };
}
