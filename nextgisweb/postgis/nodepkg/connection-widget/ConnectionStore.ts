import { makeObservable, runInAction } from "mobx";

import { mapper, validate } from "@nextgisweb/gui/arm";
import type { PostgisConnectionRead } from "@nextgisweb/postgis/type/api";
import type { EditorStore } from "@nextgisweb/resource/type";

const {
    hostname,
    port,
    sslmode,
    username,
    password,
    database,
    $load: load,
    $error: error,
} = mapper<ConnectionStore, Required<PostgisConnectionRead>>({
    validateIf: (o) => o.validate,
    onChange: (o) => o.markDirty(),
});

hostname.validate(validate.string({ minLength: 1 }));
username.validate(validate.string({ minLength: 1 }));
password.validate(validate.string({ minLength: 1 }));
database.validate(validate.string({ minLength: 1 }));

export class ConnectionStore implements EditorStore<PostgisConnectionRead> {
    readonly identity = "postgis_connection";

    dirty = false;
    validate = false;

    hostname = hostname.init("", this);
    port = port.init(null, this);
    sslmode = sslmode.init(null, this);
    username = username.init("", this);
    password = password.init("", this);
    database = database.init("", this);

    constructor() {
        makeObservable(this, {
            dirty: true,
            validate: true,
            load: true,
            markDirty: true,
            isValid: true,
        });
    }

    load(value: PostgisConnectionRead) {
        load(this, value);
        this.dirty = false;
    }

    dump(): PostgisConnectionRead | undefined {
        if (!this.dirty) return undefined;
        return {
            ...this.hostname.jsonPart(),
            ...this.port.jsonPart(),
            ...this.sslmode.jsonPart(),
            ...this.username.jsonPart(),
            ...this.password.jsonPart(),
            ...this.database.jsonPart(),
        };
    }

    markDirty() {
        this.dirty = true;
    }

    get isValid(): boolean {
        runInAction(() => {
            this.validate = true;
        });
        return error(this) === false;
    }
}
