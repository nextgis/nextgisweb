import type { ResourceRefWithParent } from "@nextgisweb/resource/type/api";

export type ImageFormat = "image/png" | "image/jpeg";
export interface WmsClientLayer {
    connection: ResourceRefWithParent;
    wmslayers: string;
    imgformat: ImageFormat;
    srs: { id: number };
    vendor_params: Record<string, string>;
}

export interface StoreValue {
    connection: ResourceRefWithParent | undefined;
    wmsLayers: string[] | undefined;
    imgFormat: ImageFormat | undefined;
    vendorParams: Record<string, string>;
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
