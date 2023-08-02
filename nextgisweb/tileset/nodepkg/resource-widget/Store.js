import { makeAutoObservable, toJS } from "mobx";

import srsSettings from "@nextgisweb/pyramid/settings!spatial_ref_sys";

export class Store {
    identity = "tileset";

    source = null;
    uploading = false;

    constructor({ composite, operation }) {
        makeAutoObservable(this, { identity: false });
        this.composite = composite;
        this.operation = operation;
    }

    load() {}

    dump({ lunkwill }) {
        const result = {};

        if (this.source) {
            result.source = this.source;
            result.srs = srsSettings.default;
        }

        lunkwill.suggest(!!this.source);

        return toJS(result);
    }

    get isValid() {
        return (
            !this.uploading && (this.operation === "update" || !!this.source)
        );
    }

    get suggestedDisplayName() {
        const base = this.source?.name;
        return base ? base.replace(/\.\w*$/, "") : null;
    }
}
