import { route } from "@nextgisweb/pyramid/api";

import type { FeatureItem } from "../../type";
import { KEY_FIELD_KEYNAME } from "../constant";
import type { OrderBy } from "../type";

interface FeatureLayerQuery {
    offset?: number;
    limit?: number;
    geom?: "yes" | "no";
    extensions?: string;
    dt_format?: "iso";
    fields?: string[];
    order_by?: string;
    like?: string;
    ilike?: string;
    intersects?: string;
}

export interface FetchFeaturesOptions {
    resourceId: number;
    intersects?: string;
    orderBy?: OrderBy;
    signal?: AbortSignal;
    fields?: string[];
    offset?: number;
    limit?: number;
    cache?: boolean;
    ilike?: string;
    like?: string;
}

export function fetchFeatures({
    resourceId,
    intersects,
    orderBy,
    signal,
    fields,
    offset,
    limit,
    cache,
    like,
    ilike,
}: FetchFeaturesOptions) {
    const query: FeatureLayerQuery = {
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

    if (intersects) {
        query.intersects = intersects;
    }

    return route("feature_layer.feature.collection", resourceId)
        .get<FeatureItem[]>({
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
