import { action, computed, observable } from "mobx";

import { mapper } from "@nextgisweb/gui/arm";
import type {
    EditorStore,
    EditorStoreOptions,
    Operation,
} from "@nextgisweb/resource/type";
import type {
    WFSConnectionRead,
    WFSConnectionUpdate,
} from "@nextgisweb/wfsclient/type/api";

type MapperConnection = NullableOmit<
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

    path = path.init(null, this);
    username = username.init(null, this);
    password = password.init(null, this);
    version = version.init("2.0.2", this);

    readonly operation: Operation;
    @observable accessor validate = false;

    constructor({ operation }: EditorStoreOptions) {
        this.operation = operation;
    }

    @action load(val: WFSConnectionRead) {
        mapperLoad(this, val);
    }

    @computed get dirty(): boolean {
        return this.operation === "create" ? true : mapperDirty(this);
    }

    dump() {
        if (this.dirty) {
            const { path, ...rest } = mapperDump(this);
            if (!path) {
                throw new Error("Missing required parameters");
            }
            const result: WFSConnectionRead | WFSConnectionUpdate = {
                path,
                ...rest,
            };
            return result;
        }
    }

    @computed get error() {
        return mapperError(this);
    }

    @computed get isValid() {
        this.validate = true;
        return !this.error;
    }
}
