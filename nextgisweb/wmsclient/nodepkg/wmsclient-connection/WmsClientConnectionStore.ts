import { action, computed, observable } from "mobx";

import { mapper } from "@nextgisweb/gui/arm";
import type { NullableProps } from "@nextgisweb/gui/type";
import type { EditorStore } from "@nextgisweb/resource/type";
import type {
    ConnectionCreate,
    ConnectionRead,
} from "@nextgisweb/wmsclient/type/api";

import type { UICapcache } from "./WmsClientConnectionWidget";

type MapperConnectionCreate = Omit<
    ConnectionCreate,
    "url" | "username" | "password" | "capcache"
> & { capcache: UICapcache } & NullableProps<
        Pick<ConnectionCreate, "url" | "username" | "password">
    >;

const {
    url,
    username,
    password,
    version,
    capcache,
    $dirty: mapperDirty,
    $load: mapperLoad,
    $error: mapperError,
} = mapper<WmsClientConnectionStore, MapperConnectionCreate>({
    validateIf: (o) => o.validate,
    properties: {
        url: { required: true, url: true },
    },
});

export class WmsClientConnectionStore implements EditorStore<
    ConnectionRead,
    ConnectionCreate,
    ConnectionCreate
> {
    readonly identity = "wmsclient_connection";

    readonly url = url.init(null, this);
    readonly username = username.init(null, this);
    readonly password = password.init(null, this);
    readonly version = version.init("1.1.1", this);
    /**  capcache is different for read and create/update:
     * - on dump - instruction flag (CapCacheEnum; default "query") to tell the server what to do (TODO: describe what server actually do)
     * - on load - contains the actual data
     */
    readonly capcache = capcache.init("query", this);

    @observable.ref accessor validate = false;

    @action
    load(val: ConnectionRead) {
        const { capcache, ...value_ } = val;
        mapperLoad(this, { capcache: "", ...value_ });
    }

    @computed
    get deserializeValue() {
        const payload = {
            ...this.url.jsonPart(),
            ...this.username.jsonPart(),
            ...this.password.jsonPart(),
            ...this.version.jsonPart(),
        } as ConnectionCreate;
        if (this.capcache.value) {
            payload.capcache = this.capcache.value;
        }

        return payload;
    }

    @computed
    get dirty(): boolean {
        return mapperDirty(this);
    }

    dump() {
        if (this.dirty) {
            return this.deserializeValue;
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
