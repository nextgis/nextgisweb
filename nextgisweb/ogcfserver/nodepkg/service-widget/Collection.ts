import { mapper, validate } from "@nextgisweb/gui/arm";
import type { ErrorResult } from "@nextgisweb/gui/arm";
import type * as apitype from "@nextgisweb/ogcfserver/type/api";

import type { ServiceStore } from "./ServiceStore";

const {
    resource_id: resourceId,
    keyname: keyname,
    display_name: displayName,
    maxfeatures: maxFeatures,
    $load: mapperLoad,
    $error: mapperError,
} = mapper<Collection, apitype.OGCFServerCollection>({
    validateIf: (o) => o.store.validate,
    onChange: (o) => o.store.markDirty(),
});

displayName.validate(
    validate.string({ minLength: 1 }),
    validate.unique((o) => o.store.collections, "displayName")
);

keyname.validate(
    validate.string({ minLength: 1, pattern: /^[A-Za-z][\w]*$/ }),
    validate.unique((o) => o.store.collections, "keyname")
);

export class Collection {
    readonly store: ServiceStore;

    resourceId = resourceId.init(-1, this);
    displayName = displayName.init("", this);
    keyname = keyname.init("", this);
    maxFeatures = maxFeatures.init(null, this);

    constructor(store: ServiceStore, data: apitype.OGCFServerCollection) {
        this.store = store;
        mapperLoad(this, data);
    }

    json(): apitype.OGCFServerCollection {
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
