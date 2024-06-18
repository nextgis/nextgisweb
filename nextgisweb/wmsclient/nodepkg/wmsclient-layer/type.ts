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
