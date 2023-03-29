import { route } from "@nextgisweb/pyramid/api";

import { KEY_FIELD_KEYNAME } from "../constant";

export function fetchFeatures({
    resourceId,
    orderBy,
    signal,
    fields,
    offset,
    limit,
    cache,
    like,
    ilike,
}) {
    const query = {
        offset,
        limit,
        geom: "no",
        extensions: "",
        dt_format: "iso",
        fields,
    };
    if (orderBy && orderBy[1]) {
        query.order_by = `${orderBy[1] === "desc" ? "-" : ""}${orderBy[0]}`;
    }
    if (like) {
        query.like = like;
    } else if (ilike) {
        query.ilike = ilike;
    }

    return route("feature_layer.feature.collection", resourceId)
        .get({
            query,
            signal,
            cache,
        })
        .then((items) => {
            return items.map((item) => ({
                ...item.fields,
                [KEY_FIELD_KEYNAME]: item.id,
            }));
        });
}
