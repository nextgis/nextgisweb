import { action, computed, observable } from "mobx";

import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";
import type {
    CompositeRead,
    CompositeUpdate,
} from "@nextgisweb/resource/type/api";

let idSeq = 0;

type Value = NonNullable<CompositeRead["svg_marker_library"]>;
type ValueUpdate = NonNullable<CompositeUpdate["svg_marker_library"]>;

export class File {
    @observable.ref accessor name: string = "";
    @observable.ref accessor file: FileMeta | null = null;

    readonly store: Store;
    readonly id: number;

    constructor(
        store: Store,
        { name, file }: { name: string; file?: FileMeta | null }
    ) {
        this.store = store;
        this.id = ++idSeq;
        this.name = name;
        this.file = file || null;
    }
}

export class Store {
    readonly identity = "svg_marker_library";

    @observable.shallow accessor files: File[] = [];
    @observable.ref accessor archive: FileMeta | null = null;
    @observable.ref accessor dirty = false;

    @action
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
        return result;
    }

    @computed
    get isValid() {
        return true;
    }

    @action
    appendFiles(files: FileMeta[]): [boolean, string | null] {
        const updated = [...this.files];
        for (const file of files) {
            let { name } = file;
            if (!name.toLowerCase().endsWith(".svg")) {
                const msgFmt = gettextf("File '{}' has an invalid extension.");
                return [false, msgFmt(name)];
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

    @action
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

    @observable.ref accessor validate = false;

    @computed
    get rows() {
        return this.files;
    }

    @action
    deleteRow(row: File) {
        this.rows.splice(this.rows.indexOf(row), 1);
        this.dirty = true;
    }
}
