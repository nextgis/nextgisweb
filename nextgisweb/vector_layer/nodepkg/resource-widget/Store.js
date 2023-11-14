import { makeAutoObservable, toJS } from "mobx";

import { gettext } from "@nextgisweb/pyramid/i18n";
import srsSettings from "@nextgisweb/pyramid/settings!spatial_ref_sys";

export class Store {
    identity = "vector_layer";

    mode = null;
    source = null;
    sourceLayer = null;
    sourceOptions = {
        "fix_errors": "LOSSY",
        "skip_errors": true,
        "cast_geometry_type": "NONE",
        "cast_is_multi": "NONE",
        "cast_has_z": "NONE",
        "fid_source": "AUTO",
        "fid_field": "ngw_id, id",
        "skip_other_geometry_types": false,
    };
    geometryType = null;

    geometryTypeInitial = null;
    confirm = false;
    uploading = false;

    dirty = false;

    constructor({ composite, operation }) {
        makeAutoObservable(this, { identity: false });
        this.operation = operation;
        this.composite = composite;
    }

    load(value) {
        this.geometryTypeInitial = value.geometry_type;
        this.dirty = false;
    }

    dump({ lunkwill }) {
        if (!this.dirty) return;

        const result = {};

        if (this.mode === "file") {
            lunkwill.suggest(true);
            result.source = this.source;
            result.source_layer = this.sourceLayer;
            result.srs = srsSettings.default;

            const so = toJS(this.sourceOptions);
            const onull = (k) => (so[k] = so[k] === "NONE" ? null : so[k]);
            const ayn = (k) => {
                const vmap = { "NONE": null, "YES": true, "NO": false };
                so[k] = vmap[so[k]];
            };
            onull("cast_geometry_type");
            ayn("cast_is_multi");
            ayn("cast_has_z");
            Object.assign(result, so);
        } else if (this.mode === "empty") {
            result.fields = [];
            result.geometry_type = this.geometryType;
            result.srs = srsSettings.default;
        } else if (this.mode === "gtype") {
            if (this.geometryType !== this.geometryTypeInitial) {
                result.geometry_type = this.geometryType;
            }
        } else if (this.mode === "delete") {
            result.delete_all_features = true;
        }

        return toJS(result);
    }

    update = (props) => {
        Object.entries(props).forEach(([k, v]) => (this[k] = v));
        if (props.confirm === undefined) this.confirm = false;
        this.dirty = true;
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
        return base ? base.replace(/\.[a-z0-9]+$/i, "") : null;
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
