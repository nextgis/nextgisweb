/* eslint-disable no-use-before-define */
import { mapper, validate } from "@nextgisweb/gui/arm";
import type { ErrorResult } from "@nextgisweb/gui/arm";
import type { WFSServerLayer } from "@nextgisweb/wfsserver/type/api";

import type { ServiceStore } from "./ServiceStore";

const {
    resource_id: resourceId,
    display_name: displayName,
    keyname: keyname,
    maxfeatures: maxFeatures,
    $load: mapperLoad,
    $error: mapperError,
} = mapper<Layer, WFSServerLayer>({
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
    maxFeatures = maxFeatures.init(null, this);

    constructor(store: ServiceStore, data: WFSServerLayer) {
        this.store = store;
        mapperLoad(this, data);
    }

    json(): WFSServerLayer {
        return {
            ...this.resourceId.jsonPart(),
            ...this.displayName.jsonPart(),
            ...this.keyname.jsonPart(),
            ...this.maxFeatures.jsonPart(),
        };
    }

    get error(): ErrorResult {
        return mapperError(this);
    }
}
