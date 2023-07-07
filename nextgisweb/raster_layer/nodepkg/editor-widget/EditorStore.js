import { makeAutoObservable, toJS } from "mobx";

import settings from "@nextgisweb/pyramid/settings!raster_layer";
import srsSettings from "@nextgisweb/pyramid/settings!spatial_ref_sys";

export class EditorStore {
    identity = "raster_layer";

    source = null;
    uploading = false;
    cog = settings.cog_enabled;
    cogInitial = null;

    constructor({ composite, operation }) {
        makeAutoObservable(this, { identity: false });
        this.operation = operation;
        this.composite = composite;
    }

    load(value) {
        this.cog = this.cogInitial = !!value.cog;
    }

    dump({ lunkwill }) {
        const result = {
            cog:
                !!this.source || this.cog !== this.cogInitial
                    ? this.cog
                    : undefined,
        };

        if (this.source) {
            result.source = this.source;
            result.srs = srsSettings.default;
        }

        lunkwill.suggest(
            this.operation === "create" ||
                !!this.source ||
                this.cog !== this.cogInitial
        );

        return toJS(result);
    }

    get isValid() {
        return (
            !this.uploading && (this.operation === "update" || !!this.source)
        );
    }

    get suggestedDisplayName() {
        const base = this.source?.name;
        return base ? base.replace(/\.tiff?$/i, "") : null;
    }
}
