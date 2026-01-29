import { useCallback, useEffect, useState } from "react";

import type { ResourceAttrItem } from "../api/ResourceAttrItem";
import type { Attributes, ResourceAttrOptions } from "../api/resource-attr";

import { useResourceAttr } from "./useResourceAttr";

export function useResourceAttrItems<A extends [...Attributes]>({
    resources,
    attributes,
    enabled = true,
}: Omit<ResourceAttrOptions<A>, "router"> & {
    enabled?: boolean;
}) {
    const { fetchResourceItems, isLoading, abort } = useResourceAttr();

    const [items, setItems] = useState<ResourceAttrItem<A>[]>();
    const [error, setError] = useState<unknown>();

    const run = useCallback(async () => {
        setError(undefined);
        try {
            const res = await fetchResourceItems<A>({ resources, attributes });
            setItems(res);
            return res;
        } catch (e) {
            setError(e);
            setItems(undefined);
        }
    }, [fetchResourceItems, resources, attributes]);

    useEffect(() => {
        if (!enabled) return;
        run();
    }, [enabled, run]);

    return { items, isLoading, abort, error, refresh: run };
}
