import { useCallback } from "react";

import { useRoute } from "@nextgisweb/pyramid/hook";

import { resourceAttr } from "../api/resource-attr";
import type { Attributes, ResourceAttrOptions } from "../api/resource-attr";

export function useResourceAttr() {
    const { route, isLoading, abort } = useRoute("resource.attr");

    const fetchResourceAttr = useCallback(
        <A extends [...Attributes]>(
            opts: Omit<ResourceAttrOptions<A>, "route">
        ) => {
            return resourceAttr<A>({ ...opts, route });
        },
        [route]
    );
    return { fetchResourceAttr, isLoading, abort };
}
