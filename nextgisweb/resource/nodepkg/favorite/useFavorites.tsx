import { useCallback, useMemo } from "react";

import { message } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type * as apitype from "@nextgisweb/resource/type/api";

interface UseFavoritesOpts {
    resource: apitype.ResourceRef;
}

type OmitUnion<T, K extends string> = T extends unknown ? Omit<T, K> : never;
type CreateNoResource = OmitUnion<apitype.ResourceFavoriteCreate, "resource">;

export function useFavorites({ resource }: UseFavoritesOpts) {
    const { makeSignal } = useAbortController();
    const [{ success }, contextHolder] = message.useMessage();

    const resourceId = resource?.id;

    const add = useCallback(
        (data: CreateNoResource) => {
            return route("resource.favorite.collection")
                .post({
                    json: {
                        resource: { id: resourceId },
                        ...data,
                    } as apitype.ResourceFavoriteCreate,
                    signal: makeSignal(),
                })
                .then((data) => {
                    success({ content: gettext("Added to favorites") });
                    return data;
                });
        },
        [success, makeSignal, resourceId]
    );

    const remove = useCallback(
        (id: number) => {
            return route("resource.favorite.item", id)
                .delete({
                    signal: makeSignal(),
                })
                .then(() => {
                    success({
                        content: gettext("Removed from favorites"),
                    });
                });
        },
        [success, makeSignal]
    );

    return useMemo(
        () => ({ add, remove, contextHolder }),
        [add, remove, contextHolder]
    );
}
