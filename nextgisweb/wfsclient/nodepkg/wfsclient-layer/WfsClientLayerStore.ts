import isEqual from "lodash-es/isEqual";
import { action, computed, makeObservable, toJS } from "mobx";

import { mapper, validate } from "@nextgisweb/gui/arm";
import { gettext } from "@nextgisweb/pyramid/i18n";
import srsSettings from "@nextgisweb/pyramid/settings!spatial_ref_sys";
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

type MapperConnectionCreate = Omit<
    WFSLayerCreate,
    "connection" | "column_geom" | "layer_name"
> &
    Nullable<Pick<WFSLayerRead, "connection" | "column_geom" | "layer_name">>;

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
    implements EditorStore<WFSLayerRead, WFSLayerUpdate>
{
    readonly identity = "wfsclient_layer";
    readonly operation: Operation;

    validate = false;

    connection = connection.init(null, this);
    layerName = layerName.init("", this);
    columnGeom = columnGeom.init("", this);
    geometryType = geometryType.init(null, this);
    geometrySrid = geometrySrid.init(null, this);
    fields = fields.init("update", this);

    private _initValue?: WFSLayerRead;

    constructor({ operation }: EditorStoreOptions) {
        this.operation = operation;
        makeObservable(this, {
            dirty: true,
            validate: true,
            load: true,
            isValid: true,
        });
    }

    @action load(value: WFSLayerRead) {
        load(this, value);
        this.fields.value = "keep";
        this._initValue = { ...value };
    }

    dump(): WFSLayerCreate | undefined {
        if (this.dirty) return this.deserializeValue;
    }

    @computed get deserializeValue(): WFSLayerCreate {
        const result = {
            ...this.connection.jsonPart(),
            ...this.columnGeom.jsonPart(),
            ...this.geometryType.jsonPart(),
            ...this.geometrySrid.jsonPart(),
            ...this.layerName.jsonPart(),
            ...this.fields.jsonPart(),
            ...(this.operation === "create"
                ? { srs: srsSettings.default }
                : {}),
        };
        // @ts-expect-error ignore resourceRef with parent
        return toJS(result);
    }

    get dirty(): boolean {
        if (this.deserializeValue && this._initValue) {
            return !isEqual(this.deserializeValue, this._initValue);
        }
        return true;
    }

    get isValid(): boolean {
        this.validate = true;
        return error(this) === false;
    }
}
