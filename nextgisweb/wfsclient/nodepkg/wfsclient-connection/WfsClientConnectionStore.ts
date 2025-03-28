import { action, computed, observable } from "mobx";

import { mapper } from "@nextgisweb/gui/arm";
import type { NullableProps } from "@nextgisweb/gui/type";
import { assert } from "@nextgisweb/jsrealm/error";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
    EditorStore,
    EditorStoreOptions,
} from "@nextgisweb/resource/type";
import type {
    WFSConnectionRead,
    WFSConnectionUpdate,
} from "@nextgisweb/wfsclient/type/api";

type MapperConnection = NullableProps<
    WFSConnectionRead,
    "path" | "username" | "password"
>;

const {
    path,
    username,
    password,
    version,
    $load: mapperLoad,
    $error: mapperError,
    $dirty: mapperDirty,
    $dump: mapperDump,
} = mapper<WfsClientConnectionStore, MapperConnection>({
    validateIf: (o) => o.validate,
    properties: {
        path: { required: true, url: true },
        username: { required: false },
        password: { required: false },
        version: { required: true },
    },
});

export class WfsClientConnectionStore
    implements
        EditorStore<WFSConnectionRead, WFSConnectionRead, WFSConnectionUpdate>
{
    readonly identity = "wfsclient_connection";
    readonly composite: CompositeStore;

    readonly path = path.init(null, this);
    readonly username = username.init(null, this);
    readonly password = password.init(null, this);
    readonly version = version.init("2.0.2", this);

    @observable.ref accessor validate = false;

    constructor({ composite }: EditorStoreOptions) {
        this.composite = composite;
    }

    @action
    load(val: WFSConnectionRead) {
        mapperLoad(this, val);
    }

    @computed
    get dirty(): boolean {
        return this.composite.operation === "create" ? true : mapperDirty(this);
    }

    dump() {
        if (this.dirty) {
            const { path, ...rest } = mapperDump(this);
            assert(path);

            const result: WFSConnectionRead | WFSConnectionUpdate = {
                path,
                ...rest,
            };
            return result;
        }
    }

    @computed
    get error() {
        return mapperError(this);
    }

    @computed
    get isValid() {
        return !this.error;
    }
}
