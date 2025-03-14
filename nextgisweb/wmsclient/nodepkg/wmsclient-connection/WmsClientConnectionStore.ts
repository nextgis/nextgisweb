import { isEqual } from "lodash-es";
import { action, computed, observable, runInAction } from "mobx";

import { mapper } from "@nextgisweb/gui/arm";
import type { NullableProps } from "@nextgisweb/gui/type";
import type { EditorStore } from "@nextgisweb/resource/type";
import type { ConnectionCreate } from "@nextgisweb/wmsclient/type/api";

type MapperConnectionCreate = Omit<
    ConnectionCreate,
    "url" | "username" | "password"
> &
    NullableProps<Pick<ConnectionCreate, "url" | "username" | "password">>;

const {
    url,
    username,
    password,
    version,
    capcache,
    $load: mapperLoad,
    $error: mapperError,
} = mapper<WmsClientConnectionStore, MapperConnectionCreate>({
    validateIf: (o) => o.validate,
    properties: {
        url: { required: true, url: true },
    },
});

export class WmsClientConnectionStore
    implements EditorStore<ConnectionCreate, ConnectionCreate>
{
    readonly identity = "wmsclient_connection";

    url = url.init(null, this);
    username = username.init(null, this);
    password = password.init(null, this);
    version = version.init("1.1.1", this);
    capcache = capcache.init("query", this);

    private _initValue?: ConnectionCreate;
    @observable accessor validate = false;

    @action load(val: ConnectionCreate) {
        const { capcache, ...value_ } = val;
        mapperLoad(this, value_);
        this._initValue = { ...value_ };
    }

    @computed get deserializeValue() {
        return {
            ...this.url.jsonPart(),
            ...this.username.jsonPart(),
            ...this.password.jsonPart(),
            ...this.version.jsonPart(),
            ...this.capcache.jsonPart(),
        } as ConnectionCreate;
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
        runInAction(() => {
            this.validate = true;
        });
        return !this.error;
    }
}
