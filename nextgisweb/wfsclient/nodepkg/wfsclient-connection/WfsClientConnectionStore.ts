import isEqual from "lodash-es/isEqual";
import { action, computed, observable, toJS } from "mobx";

import { mapper } from "@nextgisweb/gui/arm";
import type { EditorStore } from "@nextgisweb/resource/type";
import type {
    WFSConnectionRead,
    WFSConnectionUpdate,
} from "@nextgisweb/wfsclient/type/api";

type MapperConnectionCreate = Omit<
    WFSConnectionRead,
    "path" | "username" | "password"
> &
    Nullable<Pick<WFSConnectionRead, "path" | "username" | "password">>;

const {
    path,
    username,
    password,
    version,
    $load: mapperLoad,
    $error: mapperError,
} = mapper<WfsClientConnectionStore, MapperConnectionCreate>({
    validateIf: (o) => o.validate,
    properties: {
        path: { required: true, url: true },
        username: { required: false },
        password: { required: false },
        version: { required: true },
    },
});

export class WfsClientConnectionStore
    implements EditorStore<WFSConnectionRead, WFSConnectionUpdate>
{
    readonly identity = "wfsclient_connection";

    path = path.init(null, this);
    username = username.init(null, this);
    password = password.init(null, this);
    version = version.init("2.0.2", this);

    private _initValue?: WFSConnectionRead;
    @observable accessor validate = false;

    @action load(val: WFSConnectionRead) {
        mapperLoad(this, val);
        this._initValue = { ...val };
    }

    @computed get deserializeValue(): WFSConnectionRead {
        const result = {
            ...this.path.jsonPart(),
            ...this.username.jsonPart(),
            ...this.password.jsonPart(),
            ...this.version.jsonPart(),
        } as WFSConnectionRead;

        return toJS(result);
    }

    @computed get dirty(): boolean {
        if (this.deserializeValue && this._initValue) {
            return !isEqual(this.deserializeValue, this._initValue);
        }
        return true;
    }

    dump() {
        if (this.dirty) {
            return this.deserializeValue;
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
