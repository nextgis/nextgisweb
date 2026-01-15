import { useCallback } from "react";

import { useRoute } from "@nextgisweb/pyramid/hook";

import { resourceAttrItems } from "../api/resource-attr";
import type { Attributes, ResourceAttrOptions } from "../api/resource-attr";

export function useResourceAttr() {
    const { route, isLoading, abort } = useRoute("resource.attr");

    const fetchResourceItems = useCallback(
        <A extends [...Attributes]>(
            opts: Omit<ResourceAttrOptions<A>, "route">
        ) => {
            return resourceAttrItems<A>({ ...opts, route });
        },
        [route]
    );
    return { fetchResourceItems, isLoading, abort };
}
