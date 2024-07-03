import { makeObservable } from "mobx";

import { mapper, validate } from "@nextgisweb/gui/arm";
import { gettext } from "@nextgisweb/pyramid/i18n";
import srsSettings from "@nextgisweb/pyramid/settings!spatial_ref_sys";
import type {
    EditorStore,
    EditorStoreOptions,
    Operation,
} from "@nextgisweb/resource/type/EditorStore";
import type { ResourceRef } from "@nextgisweb/resource/type/api";

const msgUpdate = gettext("Fields need to be updated due to autodetection");

interface Value {
    connection: ResourceRef | null;
    schema: string;
    table: string;
    column_id: string;
    column_geom: string;
    geometry_type: string | null;
    geometry_srid: number | null;
    fields: "keep" | "update";
}

const {
    connection,
    schema,
    table,
    column_id: columnId,
    column_geom: columnGeom,
    geometry_type: geometryType,
    geometry_srid: geometrySrid,
    fields: fields,
    $load: load,
    $error: error,
} = mapper<LayerStore, Value>({
    validateIf: (o) => o.validate,
    onChange: (o) => o.markDirty(),
});

[schema, table, columnId, columnGeom].forEach((i) =>
    i.validate(validate.string({ minLength: 1, maxLength: 64 }))
);

fields.validate((v, s) => {
    if (v === "keep" && (!s.geometryType.value || !s.geometrySrid.value)) {
        return [false, msgUpdate];
    }
    return [true, undefined];
});

export class LayerStore implements EditorStore<Value> {
    readonly identity = "postgis_layer";
    readonly operation: Operation;

    dirty = false;
    validate = false;

    connection = connection.init(null, this);
    schema = schema.init("", this);
    table = table.init("", this);
    columnId = columnId.init("", this);
    columnGeom = columnGeom.init("", this);
    geometryType = geometryType.init(null, this);
    geometrySrid = geometrySrid.init(null, this);
    fields = fields.init("update", this);

    constructor({ operation }: EditorStoreOptions) {
        this.operation = operation;
        makeObservable(this, {
            dirty: true,
            validate: true,
            load: true,
            markDirty: true,
            isValid: true,
        });
    }

    load(value: Value) {
        load(this, value);
        this.fields.value = "keep";
        this.dirty = false;
    }

    dump(): Value {
        if (!this.dirty) return undefined as unknown as Value;
        return {
            ...this.connection.jsonPart(),
            ...this.schema.jsonPart(),
            ...this.table.jsonPart(),
            ...this.columnId.jsonPart(),
            ...this.columnGeom.jsonPart(),
            ...this.geometryType.jsonPart(),
            ...this.geometrySrid.jsonPart(),
            ...this.fields.jsonPart(),
            ...(this.operation === "create"
                ? { srs: srsSettings.default }
                : {}),
        };
    }

    markDirty() {
        this.dirty = true;
    }

    get isValid(): boolean {
        this.validate = true;
        return error(this) === false;
    }
}
