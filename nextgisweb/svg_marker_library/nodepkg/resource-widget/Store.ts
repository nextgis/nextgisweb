import { makeAutoObservable, toJS } from "mobx";

import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    CompositeRead,
    CompositeUpdate,
} from "@nextgisweb/resource/type/api";

let idSeq = 0;

type Value = NonNullable<CompositeRead["svg_marker_library"]>;
type ValueUpdate = NonNullable<CompositeUpdate["svg_marker_library"]>;

export class File {
    name: string = "";
    file: FileMeta | null = null;
    id: number;

    store: Store;

    constructor(
        store: Store,
        { name, file }: { name: string; file?: FileMeta | null }
    ) {
        makeAutoObservable(this);
        this.store = store;
        this.id = ++idSeq;
        this.name = name;
        this.file = file || null;
    }
}

export class Store {
    identity = "svg_marker_library";

    files: File[] = [];
    archive: FileMeta | null = null;
    dirty = false;

    constructor() {
        makeAutoObservable(this, { identity: false });
        this.files = [];
    }

    load(value: Value) {
        this.files = value.files.map(({ name }) => new File(this, { name }));
        this.archive = null;
        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return undefined;
        const result: ValueUpdate = {};
        if (this.archive) {
            result.archive = this.archive;
        } else {
            result.files = this.files.map(({ name, file }) => ({
                name: name,
                ...(file ? { id: file.id } : {}),
            }));
        }
        return toJS(result);
    }

    get isValid() {
        return true;
    }

    appendFiles(files: FileMeta[]): [boolean, string | null] {
        const updated = [...this.files];
        for (const file of files) {
            let { name } = file;
            if (!name.toLowerCase().endsWith(".svg")) {
                const msg = gettext("File '{}' has an invalid extension.");
                return [false, msg.replace("{}", name)];
            }
            name = name.slice(0, -".svg".length);

            const existing = updated.find((c) => c.name === name);
            if (existing) updated.splice(updated.indexOf(existing), 1);
            updated.push(new File(this, { name, file }));
        }
        this.files = updated;
        this.dirty = true;
        return [true, null];
    }

    fromArchive(archive: FileMeta | null): [boolean, string | null] {
        const { name } = archive || {};
        if (name && !name.toLowerCase().endsWith(".zip")) {
            return [false, gettext("ZIP archive required")];
        }

        this.archive = archive;
        this.dirty = true;
        return [true, null];
    }

    // EdiTable

    validate = false;

    get rows() {
        return this.files;
    }

    deleteRow(row: File) {
        this.rows.splice(this.rows.indexOf(row), 1);
        this.dirty = true;
    }
}
