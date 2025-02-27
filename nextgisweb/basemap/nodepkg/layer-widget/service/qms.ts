import settings from "@nextgisweb/basemap/client-settings";

import type { QMSSearch, QMSService } from "../type";

type QMSType = "tms" | "wms";

export async function get(
    id: number,
    options?: RequestInit
): Promise<QMSService> {
    const url = `${settings.qms_geoservices_url}${id}/?format=json`;

    const response = await fetch(url, {
        method: "GET",
        ...options,
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    return await response.json();
}

export async function search(
    query: string,
    options: { type?: QMSType } & RequestInit
): Promise<QMSSearch[]> {
    if (!query || query.toString().length === 0) {
        return [];
    }

    const queryOptions = {
        search: query,
        type: options.type || "tms",
    };

    const queryString = new URLSearchParams(queryOptions).toString();
    const url = `${settings.qms_geoservices_url}?${queryString}&format=json`;

    const response = await fetch(url, {
        method: "GET",
        ...options,
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    return await response.json();
}
