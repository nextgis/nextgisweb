import { observe } from "mobx";

import type * as apitype from "@nextgisweb/basemap/type/api";
import { mapper, validate } from "@nextgisweb/gui/arm";
import type { ErrorResult } from "@nextgisweb/gui/arm";

import type { WebMapStore } from "./WebMapStore";

const {
    resource_id: resourceId,
    display_name: displayName,
    enabled: enabled,
    opacity: opacity,
    $load: mapperLoad,
    $error: mapperError,
} = mapper<Basemap, apitype.BasemapWebMapItemRead>({
    validateIf: (o) => o.store.validate,
    onChange: (o) => o.store.markDirty(),
});

displayName.validate(
    validate.string({ minLength: 1 }),
    validate.unique((o) => o.store.basemaps, "displayName")
);

export class Basemap {
    readonly store: WebMapStore;

    resourceId = resourceId.init(-1, this);
    displayName = displayName.init("", this);
    enabled = enabled.init(false, this);
    opacity = opacity.init(null, this);

    constructor(store: WebMapStore, data: apitype.BasemapWebMapItemRead) {
        this.store = store;
        mapperLoad(this, data);
        observe(this.enabled, "value", () => {
            if (this.enabled.value) {
                this.store.basemaps.forEach((i) => {
                    if (i !== this && i.enabled.value) {
                        i.enabled.value = false;
                    }
                });
            }
        });
    }

    json(): apitype.BasemapWebMapItemRead {
        return {
            ...this.resourceId.jsonPart(),
            ...this.displayName.jsonPart(),
            ...this.enabled.jsonPart(),
            ...this.opacity.jsonPart(),
        };
    }

    get error(): ErrorResult {
        return mapperError(this);
    }
}
