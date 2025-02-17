import { action, computed, observable, runInAction } from "mobx";

import { mapper, validate } from "@nextgisweb/gui/arm";
import { gettext } from "@nextgisweb/pyramid/i18n";
import srsSettings from "@nextgisweb/pyramid/settings!spatial_ref_sys";
import type { Composite } from "@nextgisweb/resource/type";
import type {
    EditorStore,
    EditorStoreOptions,
    Operation,
} from "@nextgisweb/resource/type/EditorStore";
import type {
    WFSLayerCreate,
    WFSLayerRead,
    WFSLayerUpdate,
} from "@nextgisweb/wfsclient/type/api";

type MapperConnectionCreate = NullableOmit<
    WFSLayerCreate,
    "connection" | "column_geom" | "layer_name"
>;

const msgUpdate = gettext("Fields need to be updated due to autodetection");

const {
    connection,
    layer_name: layerName,
    column_geom: columnGeom,
    geometry_type: geometryType,
    geometry_srid: geometrySrid,
    fields: fields,
    $load: load,
    $error: error,
    $dirty: dirty,
    $dump: dump,
} = mapper<WfsClientLayerStore, MapperConnectionCreate>({
    validateIf: (o) => o.validate,
    properties: {
        connection: { required: true },
        layer_name: { required: true },
        column_geom: { required: true },
        fields: { required: true },
    },
});

[layerName, columnGeom].forEach((i) =>
    i.validate(validate.string({ minLength: 1, maxLength: 64 }))
);

fields.validate((v, s) => {
    if (v === "keep" && (!s.geometryType.value || !s.geometrySrid.value)) {
        return [false, msgUpdate];
    }
    return [true, undefined];
});

export class WfsClientLayerStore
    implements EditorStore<WFSLayerRead, WFSLayerCreate, WFSLayerUpdate>
{
    readonly identity = "wfsclient_layer";
    readonly operation: Operation;
    readonly composite: Composite;

    @observable accessor validate = false;

    connection = connection.init(null, this);
    layerName = layerName.init("", this);
    columnGeom = columnGeom.init("", this);
    geometryType = geometryType.init(null, this);
    geometrySrid = geometrySrid.init(null, this);
    fields = fields.init("update", this);

    constructor({ operation, composite }: EditorStoreOptions) {
        this.operation = operation;
        this.composite = composite;
    }

    @action load(value: WFSLayerRead) {
        load(this, value);
        this.fields.value = "keep";
    }

    dump() {
        if (this.dirty) {
            const { connection, layer_name, column_geom, ...rest } = dump(this);

            if (!connection || !layer_name || !column_geom) {
                throw new Error("Missing required parameters");
            }

            const result: WFSLayerCreate | WFSLayerUpdate = {
                connection,
                layer_name,
                column_geom,
                ...(this.operation === "create"
                    ? { srs: srsSettings.default }
                    : {}),
                ...rest,
            };

            return result;
        }
    }

    @computed get dirty(): boolean {
        return this.operation === "create" ? true : dirty(this);
    }

    @computed get isValid(): boolean {
        runInAction(() => {
            this.validate = true;
        });
        return !error(this);
    }
}
