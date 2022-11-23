import { route } from "@nextgisweb/pyramid/api";

import { KEY_FIELD_KEYNAME } from "../constant";


export async function fetchFeatures({
    resourceId,
    orderBy,
    signal,
    fields,
    pages,
    limit,
    cache,
    like,
}) {
    const items = [];
    const promises = [];
    for (const offset of pages) {
        const query = { offset, limit, geom: "no", extensions: "", dt_format: "iso", fields };
        if (orderBy && orderBy[1]) {
            query.order_by = `${orderBy[1] === "desc" ? "-" : ""}${orderBy[0]}`;
        }
        if (like) {
            query.like = like;
        }
        promises.push(
            route("feature_layer.feature.collection", resourceId).get({
                query,
                signal,
                cache,
            })
        );
    }
    const parts = await Promise.all(promises);
    for (const p of parts.flat()) {
        items.push({ ...p.fields, [KEY_FIELD_KEYNAME]: p.id });
    }
    return items;
}
