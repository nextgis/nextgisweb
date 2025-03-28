import { isEqual } from "lodash-es";
import { action, computed, observable } from "mobx";

import type {
    EditorStoreConstructorOptions,
    EditorStore as IEditorStore,
} from "@nextgisweb/feature-layer/type";
import type { UploaderMeta } from "@nextgisweb/file-upload/file-uploader/type";
import { assert } from "@nextgisweb/jsrealm/error";

import type { DataSource, FileMetaToUpload } from "./type";
import { findAttachmentIndex } from "./util/findAttachmentIndex";

class AttachmentEditorStore implements IEditorStore<DataSource[]> {
    readonly featureId: number | null = null;
    readonly resourceId: number;

    @observable.shallow accessor value: DataSource[] = [];
    @observable.shallow private accessor _initValue: DataSource[] = [];

    constructor({ parentStore }: EditorStoreConstructorOptions) {
        assert(parentStore);
        this.featureId = parentStore.featureId;
        this.resourceId = parentStore.resourceId;
    }

    @computed
    get counter() {
        return this.value.length;
    }

    @computed
    get dirty() {
        const value = this.value;
        const _initValue = this._initValue;
        if (value && _initValue) {
            if (value.length !== _initValue.length) {
                return true;
            }
            return !_initValue.every((val, index) =>
                isEqual(val, value[index])
            );
        }
        // just one of two is array
        const dirty =
            [this.value, this._initValue].filter((x) => Array.isArray(x))
                .length === 1;
        return dirty;
    }

    @action.bound
    load(value: DataSource[] | null) {
        value ??= [];
        this.value = value;
        this._initValue = value;
    }

    @action.bound
    reset() {
        this.value = this._initValue;
    }

    @action.bound
    append(value: UploaderMeta[]) {
        const newValue = [...(this.value || [])];

        for (const meta of value) {
            if ("id" in meta) {
                const { mime_type, id, name, size, _file } = meta;
                const itemToUpload: FileMetaToUpload = {
                    _file,
                    name,
                    size,
                    mime_type,
                    description: "",
                    file_upload: { id, size },
                };
                newValue.push(itemToUpload);
            }
        }

        this.value = newValue;
    }

    @action.bound
    updateItem(item: DataSource, field: string, value: unknown) {
        const old = this.value ? [...this.value] : [];
        const index = findAttachmentIndex(item, old);
        if (index !== -1) {
            const updatedAttachments = old;
            const oldAttachment = updatedAttachments[index];
            updatedAttachments.splice(index, 1, {
                ...oldAttachment,
                [field]: value,
            });
            this.value = updatedAttachments;
        }
    }

    @action.bound
    deleteItem(item: DataSource) {
        const old = this.value ? [...this.value] : [];
        const index = findAttachmentIndex(item, old);
        if (index !== -1) {
            const newAttachments = old;
            newAttachments.splice(index, 1);
            this.value = newAttachments.length ? newAttachments : [];
        }
    }
}

export default AttachmentEditorStore;
