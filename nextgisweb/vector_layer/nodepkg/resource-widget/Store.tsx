import { makeAutoObservable, runInAction, toJS } from "mobx";

import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import { gettext } from "@nextgisweb/pyramid/i18n";
import srsSettings from "@nextgisweb/pyramid/settings!spatial_ref_sys";
import type { Composite } from "@nextgisweb/resource/type/Composite";
import type {
    DumpParams,
    EditorStore,
    EditorStoreOptions,
    Operation,
} from "@nextgisweb/resource/type/EditorStore";
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
    identity = "vector_layer";

    mode: Mode | null = "file";
    source: FileMeta | null = null;
    sourceLayer: string | null = null;
    sourceOptions: SourceOptions = {
        "fix_errors": "LOSSY",
        "skip_errors": true,
        "cast_geometry_type": null,
        "cast_is_multi": null,
        "cast_has_z": null,
        "fid_source": "AUTO",
        "fid_field": "ngw_id, id",
        "skip_other_geometry_types": false,
    };

    geometryType: GeometryType | null = null;
    geometryTypeInitial: GeometryType | null = null;

    confirm = false;
    uploading = false;

    dirty = false;

    operation?: Operation;
    composite: Composite;

    constructor({ composite, operation }: EditorStoreOptions) {
        makeAutoObservable(this, { identity: false });
        this.operation = operation;
        this.composite = composite;
    }

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

            const so = toJS<Record<keyof SourceOptions, unknown>>(
                this.sourceOptions
            );
            const onull = (k: keyof SourceOptions) => {
                if (so[k] === "NONE") {
                    so[k] = null;
                }
            };
            const ayn = (k: keyof SourceOptions) => {
                const vmap: Record<string, unknown> = {
                    "NONE": null,
                    "YES": true,
                    "NO": false,
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

        return toJS(result);
    }

    updateSourceOptions = (sourceOptions: Partial<SourceOptions>) => {
        runInAction(() => {
            const so = { ...this.sourceOptions };
            Object.entries(sourceOptions).forEach(([key, value]) => {
                (so as Record<string, unknown>)[key] = value;
            });

            this.sourceOptions = so;
        });
    };

    update = (props: Partial<this>) => {
        runInAction(() => {
            Object.assign(this, props);

            if (!("confirm" in props)) {
                this.confirm = false;
            }

            this.dirty = true;
        });
    };

    get isValid() {
        if (this.confirmMsg && !this.confirm) return false;
        if (this.mode === "file") {
            return (
                !this.uploading && !!this.source && this.sourceLayer !== null
            );
        }
        return true;
    }

    get suggestedDisplayName() {
        if (this.sourceLayer) return this.sourceLayer;
        const base = this.source?.name;
        return base ? base.replace(/\.[a-z0-9]+$/i, "") : undefined;
    }

    get confirmMsg() {
        if (this.operation === "create") return undefined;
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
