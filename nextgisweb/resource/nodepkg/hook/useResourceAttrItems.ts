import { useCallback, useEffect, useState } from "react";

import type {
    Attributes,
    ResourceAttrOptions,
    resourceAttr,
} from "../api/resource-attr";

import { useResourceAttr } from "./useResourceAttr";

export function useResourceAttrItems<A extends [...Attributes]>({
    resources,
    attributes,
    enabled = true,
}: Omit<ResourceAttrOptions<A>, "router"> & {
    enabled?: boolean;
}) {
    const { fetchResourceAttr, isLoading, abort } = useResourceAttr();

    const [items, setItems] =
        useState<Awaited<ReturnType<typeof resourceAttr<A>>>>();
    const [error, setError] = useState<unknown>();

    const run = useCallback(async () => {
        setError(undefined);
        try {
            const res = await fetchResourceAttr<A>({ resources, attributes });
            setItems(res);
            return res;
        } catch (e) {
            setError(e);
            setItems(undefined);
        }
    }, [fetchResourceAttr, resources, attributes]);

    useEffect(() => {
        if (!enabled) return;
        run();
    }, [enabled, run]);

    return { items, isLoading, abort, error, refresh: run };
}
