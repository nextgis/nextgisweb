import isEqual from "lodash-es/isEqual";
import { makeAutoObservable, toJS } from "mobx";

import type { EditorStore } from "@nextgisweb/resource/type";
import type { ResourceRef } from "@nextgisweb/resource/type/api";

import { VendorParamsStore } from "./VendorParamsStore";
import type { ImageFormat, StoreValue, WmsClientLayer } from "./type";

export class WmsClientLayerStore
    implements EditorStore<WmsClientLayer, WmsClientLayer | undefined>
{
    readonly identity = "wmsclient_layer";

    private _initValue: WmsClientLayer | null = null;

    connection: ResourceRef | undefined = undefined;
    wmsLayers: string[] | undefined = undefined;
    imgFormat: ImageFormat | undefined = undefined;
    vendorParams: Record<string, string>  = {};

    constructor() {
        makeAutoObservable<WmsClientLayerStore, "_initValue">(this, {
            identity: false,
            _initValue: false,
        });
    }

    load(val: WmsClientLayer) {
        console.table(val);
        this.connection = val.connection;
        this.wmsLayers = val.wmslayers?.split(",");
        this.imgFormat = val.imgformat;
        this.vendorParams = val.vendor_params;
    }

    get deserializeValue(): WmsClientLayer {
        const result = {
            connection: this.connection,
            wmslayers: this.wmsLayers?.join(","),
            imgformat: this.imgFormat,
            vendor_params: this.vendorParams,
        } as WmsClientLayer;

        return toJS(result);
    }

    dump() {
        if (this.dirty) {
            return this.deserializeValue;
        }
    }

    get isValid() {
        return true;
    }

    get dirty(): boolean {
        if (this.deserializeValue && this._initValue) {
            const value = this.deserializeValue;
            const isValuesEqual = !isEqual(value, this._initValue);
            return isValuesEqual;
        }
        return false;
    }

    update(source: Partial<StoreValue>) {
        Object.entries(source).forEach(
            ([key, value]) => ((this as any)[key] = value)
        );
    }
}
