import { useState } from "react";

import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type * as apitype from "@nextgisweb/resource/type/api";

import { useFavorites } from "./useFavorites";

import IconFavoriteOutline from "@nextgisweb/icon/material/star";
import IconFavoriteFill from "@nextgisweb/icon/material/star/fill";

const url = routeURL("resource.favorite.page");
const resourceFavorite = ngwConfig.resourceFavorite;

interface ToggleProps {
    resource: apitype.ResourceRef;
    identity: string;
    current: number | null;
}

function Toggle({ resource, identity, current: initial }: ToggleProps) {
    const [current, setCurrent] = useState(initial);
    const favorites = useFavorites({ resource });
    const Icon = current ? IconFavoriteFill : IconFavoriteOutline;

    type Add = Parameters<typeof favorites.add>[0];

    return (
        <>
            {favorites.contextHolder}
            <Icon
                fontSize="22px"
                onClick={(evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    if (!current) {
                        favorites.add({ identity } as Add).then(({ id }) => {
                            setCurrent(id);
                        });
                    } else {
                        favorites.remove(current).then(() => {
                            setCurrent(null);
                        });
                    }
                }}
            />
        </>
    );
}

export function ResourceFavoriteAvatar() {
    return (
        <a href={url} style={{ display: "flex", flexDirection: "row" }}>
            <span style={{ flexGrow: 1 }}>{gettext("Favorites")}</span>
            {resourceFavorite && <Toggle {...resourceFavorite} />}
        </a>
    );
}
