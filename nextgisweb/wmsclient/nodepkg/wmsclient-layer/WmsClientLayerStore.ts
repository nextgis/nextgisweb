import isEqual from "lodash-es/isEqual";
import { action, computed, observable, toJS } from "mobx";

import { mapper } from "@nextgisweb/gui/arm";
import type { EditorStore } from "@nextgisweb/resource/type";
import type { RelationshipRef } from "@nextgisweb/resource/type/api";
import type { LayerCreate, LayerRead } from "@nextgisweb/wmsclient/type/api";

type MapperLayerCreate = Omit<
    LayerCreate,
    "connection" | "imgformat" | "vendor_params"
> &
    Nullable<Pick<LayerCreate, "connection" | "imgformat" | "vendor_params">>;

const {
    connection,
    wmslayers,
    imgformat,
    vendor_params,
    $load: mapperLoad,
    $error: mapperError,
} = mapper<WmsClientLayerStore, MapperLayerCreate>({
    validateIf: (o) => o.validate,
    properties: {
        connection: { required: true },
        imgformat: { required: true },
        wmslayers: { required: true },
    },
});

export class WmsClientLayerStore
    implements EditorStore<LayerRead, LayerCreate>
{
    readonly identity = "wmsclient_layer";

    connection = connection.init(null, this);
    wmslayers = wmslayers.init("", this);
    imgformat = imgformat.init(null, this);
    vendor_params = vendor_params.init({}, this);
    @observable accessor srs: RelationshipRef | undefined = { id: 3857 };

    private _initValue?: LayerRead;
    @observable accessor validate = false;

    @action load(val: LayerRead) {
        mapperLoad(this, val);
        this.srs = val.srs;
        this._initValue = { ...val };
    }

    @computed get deserializeValue(): LayerCreate {
        const result = {
            ...this.connection.jsonPart(),
            ...this.wmslayers.jsonPart(),
            ...this.imgformat.jsonPart(),
            ...this.vendor_params.jsonPart(),
            srs: this.srs,
        } as LayerCreate;

        return toJS(result);
    }

    @computed get dirty(): boolean {
        if (this.deserializeValue && this._initValue) {
            return !isEqual(this.deserializeValue, this._initValue);
        }
        return true;
    }

    dump() {
        if (this.dirty) {
            return this.deserializeValue;
        }
    }

    @computed get error() {
        return mapperError(this);
    }

    @computed get isValid() {
        this.validate = true;
        return !this.error;
    }
}
