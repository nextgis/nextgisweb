import { action, computed, observable } from "mobx";

import { mapper } from "@nextgisweb/gui/arm";
import type { NullableProps } from "@nextgisweb/gui/type";
import { assert } from "@nextgisweb/jsrealm/error";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
    EditorStore,
    EditorStoreOptions,
} from "@nextgisweb/resource/type";
import srsSettings from "@nextgisweb/spatial-ref-sys/client-settings";
import type {
    LayerCreate,
    LayerRead,
    LayerUpdate,
} from "@nextgisweb/tmsclient/type/api";

type MapperLayerCreate = NullableProps<
    LayerCreate,
    "connection" | "minzoom" | "maxzoom"
> & {
    extent: {
        left: number | null;
        top: number | null;
        right: number | null;
        bottom: number | null;
    } | null;
};

const zoomLimit = { min: 0, max: 24 };

const {
    connection,
    layer_name,
    tilesize,
    minzoom,
    maxzoom,
    extent,
    $load: mapperLoad,
    $dump: mapperDump,
    $dirty: mapperDirty,
    $error: mapperError,
} = mapper<TmsClientLayerStore, MapperLayerCreate>({
    validateIf: (o) => o.validate,
    properties: {
        connection: { required: true },
        minzoom: zoomLimit,
        maxzoom: zoomLimit,
        tilesize: { min: 0 },
    },
});

export class TmsClientLayerStore
    implements EditorStore<LayerRead, LayerCreate, LayerUpdate>
{
    readonly identity = "tmsclient_layer";
    readonly composite: CompositeStore;

    readonly connection = connection.init(null, this);
    readonly layer_name = layer_name.init("", this);
    // TODO: Receive default parameters from settings
    readonly tilesize = tilesize.init(256, this);
    readonly minzoom = minzoom.init(0, this);
    readonly maxzoom = maxzoom.init(14, this);
    readonly extent = extent.init(null, this);

    @observable.ref accessor validate = false;

    constructor({ composite }: EditorStoreOptions) {
        this.composite = composite;
    }

    @action
    load(val: LayerRead) {
        const value: MapperLayerCreate = {
            ...val,
            extent: {
                left: val.extent_left,
                bottom: val.extent_bottom,
                right: val.extent_right,
                top: val.extent_top,
            },
        };
        mapperLoad(this, value);
    }

    @computed
    get dirty(): boolean {
        return mapperDirty(this);
    }

    dump() {
        if (this.dirty) {
            const { extent, tilesize, minzoom, maxzoom, connection, ...rest } =
                mapperDump(this);
            assert(connection);

            const result: LayerCreate | LayerUpdate = {
                connection,
                extent_left: extent?.left,
                extent_bottom: extent?.bottom,
                extent_right: extent?.right,
                extent_top: extent?.top,
                ...(typeof minzoom === "number" && { minzoom }),
                ...(typeof maxzoom === "number" && { maxzoom }),
                ...(typeof tilesize === "number" && { tilesize }),
                ...(this.composite.operation === "create"
                    ? { srs: srsSettings.default }
                    : {}),
                ...rest,
            };

            return result;
        }
    }

    @computed
    get error() {
        return mapperError(this);
    }

    @computed
    get isValid(): boolean {
        return !this.error;
    }
}
