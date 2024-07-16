import type { ResourceRef } from "@nextgisweb/resource/type/api";

export type ImageFormat = "image/png" | "image/jpeg";

export interface StoreValue {
    connection: ResourceRef | undefined;
    wmsLayers: string[] | undefined;
    imgFormat: ImageFormat | undefined;
    vendorParams: Record<string, string>;
    srs: { id: number };
}

export interface WMSConnectionLayer {
    id: string;
    title: string;
    bbox: number[];
}
export interface Capcache {
    formats: string[];
    layers: WMSConnectionLayer[];
}

export interface WMSClientConnectionResource {
    url: string;
    version: "1.1.1" | "1.3.1";
    username: null | string;
    password: null | string;
    capcache: Capcache;
}
