import { action, computed, observable } from "mobx";

import { mapper, validate } from "@nextgisweb/gui/arm";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
    EditorStore,
    EditorStoreOptions,
} from "@nextgisweb/resource/type";
import type {
    ConnectionCreate,
    ConnectionUpdate,
} from "@nextgisweb/tmsclient/type/api";

const {
    url_template,
    apikey_param,
    username,
    password,
    insecure,
    capmode,
    scheme,
    apikey,
    $dump: mapperDump,
    $load: mapperLoad,
    $dirty: mapperDirty,
    $error: mapperError,
} = mapper<TmsClientConnectionStore, ConnectionCreate>({
    validateIf: (o) => o.validate,
});

url_template.validate((v, store) => {
    if (store.capmode.value !== "nextgis_geoservices") {
        const [valid, message] = validate.required()(v, store);
        return !valid
            ? [valid, message]
            : validate.string({ url: true })(v as string, store);
    }
    return [true, undefined];
});
apikey.validate((v, store) => {
    if (store.capmode.value === "nextgis_geoservices") {
        return validate.required()(v, store);
    }
    return [true, undefined];
});

export class TmsClientConnectionStore
    implements EditorStore<ConnectionCreate, ConnectionCreate, ConnectionUpdate>
{
    readonly identity = "tmsclient_connection";
    readonly composite: CompositeStore;

    readonly apikeyParam = apikey_param.init(null, this);
    readonly urlTemplate = url_template.init(null, this);
    readonly username = username.init(null, this);
    readonly password = password.init(null, this);
    readonly insecure = insecure.init(false, this);
    readonly capmode = capmode.init(null, this);
    readonly scheme = scheme.init("xyz", this);
    readonly apikey = apikey.init(null, this);

    @observable.ref accessor validate = false;

    constructor({ composite }: EditorStoreOptions) {
        this.composite = composite;
    }

    @action
    load(val: ConnectionCreate) {
        mapperLoad(this, val);
    }

    dump() {
        if (this.dirty) {
            const { ...rest } = mapperDump(this);
            const result: ConnectionCreate | ConnectionUpdate = { ...rest };
            return result;
        }
    }

    @computed
    get dirty(): boolean {
        return mapperDirty(this);
    }

    @computed
    get error() {
        return mapperError(this);
    }

    @computed
    get isValid(): boolean {
        return !this.error;
    }
}
