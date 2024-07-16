import { makeAutoObservable, toJS } from "mobx";

import type { EditorStore } from "@nextgisweb/resource/type";
import type { ResourceRef } from "@nextgisweb/resource/type/api";
import type { SRSRef } from "@nextgisweb/spatial-ref-sys/type/api";

import type { ImageFormat, StoreValue, WmsClientLayer } from "./type";

export class WmsClientLayerStore
    implements EditorStore<WmsClientLayer, WmsClientLayer | undefined>
{
    readonly identity = "wmsclient_layer";

    connection: ResourceRef | undefined = undefined;
    wmsLayers: string[] = [];
    imgFormat: ImageFormat | undefined = undefined;
    vendorParams: Record<string, string> = {};
    srs: SRSRef = { id: 3857 };
    dirty = false;

    constructor() {
        makeAutoObservable<WmsClientLayerStore>(this, {
            identity: false,
        });
    }

    load(val: WmsClientLayer) {
        this.connection = val.connection;
        this.wmsLayers = val.wmslayers.split(",");
        this.imgFormat = val.imgformat;
        this.vendorParams = val.vendor_params;
        this.srs = val.srs;
    }

    get deserializeValue(): WmsClientLayer {
        const result = {
            connection: this.connection,
            wmslayers: this.wmsLayers?.join(","),
            imgformat: this.imgFormat,
            vendor_params: this.vendorParams,
            srs: this.srs,
        } as WmsClientLayer;

        return toJS(result);
    }

    dump() {
        if (this.dirty && this.allFieldsFilled) {
            return this.deserializeValue;
        }
    }

    get isValid() {
        return true;
    }

    get allFieldsFilled(): boolean {
        // eslint-disable-next-line
        return Object.values(this).every((val: any) => val != undefined);
    }

    update(source: Partial<StoreValue>) {
        Object.entries(source).forEach(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ([key, value]) => ((this as any)[key] = value)
        );
        this.dirty = true;
    }
}
