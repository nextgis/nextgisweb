import { action, computed, observable, runInAction } from "mobx";

import { mapper } from "@nextgisweb/gui/arm";
import type {
    EditorStore,
    EditorStoreOptions,
    Operation,
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
    properties: {
        url_template: { url: true },
    },
});

export class TmsClientConnectionStore
    implements EditorStore<ConnectionCreate, ConnectionCreate, ConnectionUpdate>
{
    readonly identity = "tmsclient_connection";
    readonly operation: Operation;

    readonly apikeyParam = apikey_param.init(null, this);
    readonly urlTemplate = url_template.init(null, this);
    readonly username = username.init(null, this);
    readonly password = password.init(null, this);
    readonly insecure = insecure.init(false, this);
    readonly capmode = capmode.init(null, this);
    readonly scheme = scheme.init("xyz", this);
    readonly apikey = apikey.init(null, this);

    @observable accessor validate = false;

    constructor({ operation }: EditorStoreOptions) {
        this.operation = operation;
    }

    @action load(val: ConnectionCreate) {
        mapperLoad(this, val);
    }

    dump() {
        if (this.dirty) {
            const { ...rest } = mapperDump(this);
            const result: ConnectionCreate | ConnectionUpdate = { ...rest };
            return result;
        }
    }

    @computed get dirty(): boolean {
        return this.operation === "create" ? true : mapperDirty(this);
    }

    @computed get error() {
        return mapperError(this);
    }

    @computed get isValid(): boolean {
        runInAction(() => {
            this.validate = true;
        });
        return !this.error;
    }
}
