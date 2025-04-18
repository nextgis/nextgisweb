import { isEmpty } from "lodash-es";
import { action, computed, observable } from "mobx";

import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
    DumpParams,
    EditorStore,
    EditorStoreOptions,
} from "@nextgisweb/resource/type";
import srsSettings from "@nextgisweb/spatial-ref-sys/client-settings";
import type * as apitype from "@nextgisweb/vector-layer/type/api";

export type Mode = "empty" | "gtype" | "file" | "keep" | "delete";
export type GeometryType = Required<apitype.VectorLayerUpdate>["geometry_type"];

type SourceOptions = Required<
    Pick<
        apitype.VectorLayerUpdate,
        | "fix_errors"
        | "skip_errors"
        | "skip_other_geometry_types"
        | "cast_geometry_type"
        | "cast_is_multi"
        | "cast_has_z"
        | "fid_source"
        | "fid_field"
    >
>;

export class Store
    implements
        EditorStore<
            apitype.VectorLayerRead,
            apitype.VectorLayerUpdate,
            apitype.VectorLayerCreate
        >
{
    readonly identity = "vector_layer";
    readonly composite: CompositeStore;

    @observable.ref accessor mode: Mode | null = "file";
    @observable.shallow accessor source: FileMeta | null = null;
    @observable.ref accessor sourceLayer: string | null = null;
    @observable.shallow accessor sourceOptions: SourceOptions = {
        fix_errors: "LOSSY",
        skip_errors: true,
        cast_geometry_type: null,
        cast_is_multi: null,
        cast_has_z: null,
        fid_source: "AUTO",
        fid_field: "ngw_id, id",
        skip_other_geometry_types: false,
    };

    @observable.ref accessor geometryType: GeometryType | null = null;
    @observable.ref accessor geometryTypeInitial: GeometryType | null = null;

    @observable.ref accessor confirm = false;
    @observable.ref accessor uploading = false;

    @observable.ref accessor dirty = false;

    constructor({ composite }: EditorStoreOptions) {
        this.composite = composite;
        this.mode = this.composite.operation === "create" ? "file" : "keep";
    }

    @action
    load(value: apitype.VectorLayerRead) {
        this.geometryTypeInitial = value.geometry_type;
        this.dirty = false;
    }

    dump({ lunkwill }: DumpParams) {
        if (!this.dirty) return undefined;

        const result: apitype.VectorLayerUpdate = {};

        if (this.mode === "file") {
            lunkwill.suggest(true);
            result.source = this.source!;
            result.source_layer = this.sourceLayer!;
            result.srs = srsSettings.default;

            const so = { ...this.sourceOptions } as Record<
                keyof SourceOptions,
                unknown
            >;

            const onull = (k: keyof SourceOptions) => {
                if (so[k] === "NONE") {
                    so[k] = null;
                }
            };
            const ayn = (k: keyof SourceOptions) => {
                const vmap: Record<string, unknown> = {
                    NONE: null,
                    YES: true,
                    NO: false,
                };
                const val = so[k] as string;
                if (val in vmap) {
                    so[k] = vmap[val];
                }
            };
            onull("cast_geometry_type");
            ayn("cast_is_multi");
            ayn("cast_has_z");
            Object.assign(result, so);
        } else if (this.mode === "empty") {
            result.fields = [];
            result.geometry_type = this.geometryType!;
            result.srs = srsSettings.default;
        } else if (this.mode === "gtype") {
            if (this.geometryType !== this.geometryTypeInitial) {
                result.geometry_type = this.geometryType!;
            }
        } else if (this.mode === "delete") {
            result.delete_all_features = true;
        }

        return result;
    }

    @action.bound
    updateSourceOptions(sourceOptions: Partial<SourceOptions>) {
        const so = { ...this.sourceOptions };
        Object.entries(sourceOptions).forEach(([key, value]) => {
            (so as Record<string, unknown>)[key] = value;
        });

        if (sourceOptions.cast_geometry_type === null) {
            so.skip_other_geometry_types = false;
        }

        this.sourceOptions = so;
    }

    @computed
    get isValid() {
        if (this.confirmMsg && !this.confirm) return false;
        if (this.mode === "file") {
            return (
                !this.uploading && !!this.source && this.sourceLayer !== null
            );
        }
        return true;
    }

    @computed
    get suggestedDisplayName() {
        if (this.sourceLayer) return this.sourceLayer;
        const base = this.source?.name;
        return base ? base.replace(/\.[a-z0-9]+$/i, "") : undefined;
    }

    @action.bound
    update(values: Partial<Omit<this, "source" | "uploading">>) {
        for (const [k, v] of Object.entries(values)) {
            if (this[k as keyof typeof values] === v) {
                delete values[k as keyof typeof values];
            }
        }

        if (isEmpty(values)) return;

        if (values.geometryType) Object.assign(this, values);

        if (!("confirm" in values)) {
            this.confirm = false;
        }

        this.dirty = true;
    }

    @action.bound
    setSource(value: this["source"] | undefined) {
        value = value ?? null;
        if (this.source === value) return;
        this.source = value;
        this.dirty = true;
    }

    @action.bound
    setUploading(value: this["uploading"]) {
        this.uploading = value;
    }

    @computed
    get confirmMsg() {
        if (this.composite.operation === "create") return undefined;
        const mode = this.mode;

        if (
            mode === "delete" ||
            (mode === "file" && this.sourceLayer !== null)
        ) {
            return gettext("Confirm deletion of existing features");
        }

        if (
            mode === "gtype" &&
            this.geometryType !== this.geometryTypeInitial
        ) {
            return gettext("Confirm change of geometry type");
        }
        return undefined;
    }
}
