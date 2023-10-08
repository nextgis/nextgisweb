import { makeAutoObservable, toJS } from "mobx";

import { annotation, editing } from "@nextgisweb/pyramid/settings!webmap";

export class SettingStore {
    identity = "webmap";

    editable = false;
    annotationEnabled = false;
    annotationDefault = "no";
    legendSymbols = null;

    dirty = false;

    constructor() {
        makeAutoObservable(this, { identity: false });
    }

    load(value) {
        this.editable = value.editable;
        this.annotationEnabled = !!value.annotation_enabled;
        this.annotationDefault = value.annotation_default;
        this.legendSymbols = value.legend_symbols;

        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return;
        const result = {
            legend_symbols: this.legendSymbols ? this.legendSymbols : null,
        };
        if (editing) result.editable = this.editable;
        if (annotation) {
            result.annotation_enabled = this.annotationEnabled;
            result.annotation_default = this.annotationDefault;
        }
        return toJS(result);
    }

    get isValid() {
        return true;
    }

    update(source) {
        Object.entries(source).forEach(([key, value]) => (this[key] = value));
        this.dirty = true;
    }
}
