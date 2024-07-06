import { mapper, validate } from "@nextgisweb/gui/arm";
import type { ErrorResult } from "@nextgisweb/gui/arm";
import type * as apitype from "@nextgisweb/wmsserver/type/api";

import type { ServiceStore } from "./ServiceStore";

const {
    resource_id: resourceId,
    keyname: keyname,
    display_name: displayName,
    min_scale_denom: minScaleDenom,
    max_scale_denom: maxScaleDenom,
    $load: mapperLoad,
    $error: mapperError,
} = mapper<Layer, apitype.WMSServiceLayer>({
    validateIf: (o) => o.store.validate,
    onChange: (o) => o.store.markDirty(),
});

displayName.validate(
    validate.string({ minLength: 1 }),
    validate.unique((o) => o.store.layers, "displayName")
);

keyname.validate(
    validate.string({ minLength: 1, pattern: /^[A-Za-z][\w]*$/ }),
    validate.unique((o) => o.store.layers, "keyname")
);

export class Layer {
    readonly store: ServiceStore;

    resourceId = resourceId.init(-1, this);
    displayName = displayName.init("", this);
    keyname = keyname.init("", this);
    minScaleDenom = minScaleDenom.init(null, this);
    maxScaleDenom = maxScaleDenom.init(null, this);

    constructor(store: ServiceStore, data: apitype.WMSServiceLayer) {
        this.store = store;
        mapperLoad(this, data);
    }

    json(): apitype.WMSServiceLayer {
        return {
            ...this.resourceId.jsonPart(),
            ...this.displayName.jsonPart(),
            ...this.keyname.jsonPart(),
            ...this.minScaleDenom.jsonPart(),
            ...this.maxScaleDenom.jsonPart(),
        };
    }

    get error(): ErrorResult {
        return mapperError(this);
    }
}
