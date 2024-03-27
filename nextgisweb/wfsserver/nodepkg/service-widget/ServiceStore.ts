import { makeAutoObservable, toJS } from "mobx";

import type {
    EditorStoreOptions,
    EditorStore as IEditorStore,
    Operations,
} from "@nextgisweb/resource/type/EditorStore";

interface Value {
    //
}

export class ServiceStore implements IEditorStore<Value> {
    readonly identity = "ngw-wfsserver";

    uploading = false;

    operation?: Operations;

    constructor({ operation }: EditorStoreOptions) {
        makeAutoObservable<ServiceStore>(this, {});
        this.operation = operation;
    }

    get isValid() {
        return !this.uploading;
    }

    load(value: Value) {
        console.log(value);
    }

    dump() {
        const result: Value = {};

        return toJS(result);
    }
}
