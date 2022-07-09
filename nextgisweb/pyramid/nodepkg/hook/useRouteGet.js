import { useEffect, useState } from "react";
import { useRoute } from "./useRoute";

export function useRouteGet({ name, params = {}, options = {} }) {
    const { route, isLoading, abort } = useRoute(name, params);
    const [data, setData] = useState();
    const [error, setError] = useState();

    useEffect(() => {
        route.get(options).then(setData).catch(setError);
    }, []);

    return { data, error, isLoading, abort };
}
