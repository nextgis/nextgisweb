import type { ResourceRef } from "@nextgisweb/resource/type/api";
import type { CapCache } from "@nextgisweb/wmsclient/type/api";

export type ImageFormat = "image/png" | "image/jpeg";

export interface StoreValue {
    connection: ResourceRef | undefined;
    wmsLayers: string[] | undefined;
    imgFormat: ImageFormat | undefined;
    vendorParams: Record<string, string>;
    srs: { id: number };
}

export interface WMSClientConnectionResource {
    url: string;
    version: "1.1.1" | "1.3.1";
    username: null | string;
    password: null | string;
    capcache: CapCache;
}
