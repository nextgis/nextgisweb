import { makeAutoObservable, toJS } from "mobx";

import type {
    EditorStoreOptions,
    EditorStore as IEditorStore,
    Operation,
} from "@nextgisweb/resource/type/EditorStore";

import type { WfsServiceLayer } from "./type";

export interface Value {
    layers: WfsServiceLayer[];
}

export class ServiceStore implements IEditorStore<Value> {
    readonly identity = "wfsserver_service";
    readonly parentId: number;
    readonly operation?: Operation;

    isLoaded = false;
    uploading = false;
    value?: Value | null = null;
    initValue?: Value | null = null;

    constructor({ operation, composite }: EditorStoreOptions) {
        makeAutoObservable<ServiceStore>(this, {});
        this.operation = operation;
        this.parentId = composite.parent;
        this.isLoaded = operation === "create";
    }

    get isValid() {
        return !this.uploading;
    }

    load(value: Value) {
        this.setValue(value);
        this.initValue = { ...value };
        this.isLoaded = true;
    }

    dump() {
        const result: Value = this.value || { layers: [] };

        return toJS(result);
    }

    setValue(value: Value) {
        this.value = value;
    }
}
