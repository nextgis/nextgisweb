import { action, computed, observable, runInAction } from "mobx";

import { mapper } from "@nextgisweb/gui/arm";
import type { NullableProps } from "@nextgisweb/gui/type";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
    EditorStore,
    EditorStoreOptions,
    Operation,
} from "@nextgisweb/resource/type";
import srsSettings from "@nextgisweb/spatial-ref-sys/client-settings";
import type {
    LayerCreate,
    LayerRead,
    LayerUpdate,
} from "@nextgisweb/wmsclient/type/api";

type MapperLayerCreate = NullableProps<
    LayerCreate,
    "connection" | "imgformat" | "vendor_params"
>;

const {
    connection,
    wmslayers,
    imgformat,
    vendor_params,
    $load: mapperLoad,
    $error: mapperError,
    $dump: mapperDump,
    $dirty: mapperDirty,
} = mapper<WmsClientLayerStore, MapperLayerCreate>({
    validateIf: (o) => o.validate,
    properties: {
        connection: { required: true },
        imgformat: { required: true },
        wmslayers: { required: true },
    },
});

export class WmsClientLayerStore
    implements EditorStore<LayerRead, LayerCreate, LayerUpdate>
{
    readonly identity = "wmsclient_layer";

    readonly operation: Operation;
    readonly composite: CompositeStore;

    connection = connection.init(null, this);
    wmslayers = wmslayers.init("", this);
    imgformat = imgformat.init(null, this);
    vendor_params = vendor_params.init({}, this);

    @observable accessor validate = false;

    constructor({ operation, composite }: EditorStoreOptions) {
        this.operation = operation;
        this.composite = composite;
    }

    @action load(val: LayerRead) {
        mapperLoad(this, val);
    }

    @computed get dirty(): boolean {
        return this.operation === "create" ? true : mapperDirty(this);
    }

    dump() {
        if (this.dirty) {
            const { wmslayers, imgformat, connection, vendor_params, ...rest } =
                mapperDump(this);

            if (!connection || !imgformat || !vendor_params || !wmslayers) {
                throw Error();
            }

            return {
                wmslayers,
                imgformat,
                connection,
                vendor_params,
                ...rest,
                ...(this.operation === "create"
                    ? { srs: srsSettings.default }
                    : {}),
            };
        }
    }

    @computed get error() {
        return mapperError(this);
    }

    @computed get isValid() {
        runInAction(() => {
            this.validate = true;
        });
        return !this.error;
    }
}
