import isEqual from "lodash-es/isEqual";
import { makeAutoObservable, toJS } from "mobx";

import type {
    EditorStoreConstructorOptions,
    EditorStore as IEditorStore,
} from "@nextgisweb/feature-layer/type";
import type { UploaderMeta } from "@nextgisweb/file-upload/file-uploader/type";

import type { DataSource, FileMetaToUpload } from "./type";
import { findAttachmentIndex } from "./util/findAttachmentIndex";

class AttachmentEditorStore implements IEditorStore<DataSource[] | null> {
    value: DataSource[] | null = null;

    featureId: number;
    resourceId: number;

    _initValue: DataSource[] | null = null;

    constructor({ parentStore }: EditorStoreConstructorOptions) {
        if (!parentStore) {
            throw new Error(
                "The `parentStore` is required for AttachmentEditorStore"
            );
        }

        this.featureId = parentStore.featureId;
        this.resourceId = parentStore.resourceId;
        makeAutoObservable(this, { featureId: false, resourceId: false });
    }

    get counter() {
        return this.value && String(this.value.length);
    }

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

    load = (value: DataSource[] | null) => {
        this.value = value;
        this._initValue = toJS(value);
    };

    reset = () => {
        this.load(this._initValue);
    };

    append = (value: UploaderMeta[]) => {
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
    };

    updateItem = (item: DataSource, field: string, value: unknown) => {
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
    };

    deleteItem = (item: DataSource) => {
        const old = this.value ? [...this.value] : [];
        const index = findAttachmentIndex(item, old);
        if (index !== -1) {
            const newAttachments = old;
            newAttachments.splice(index, 1);
            this.value = newAttachments.length ? newAttachments : null;
        }
    };
}

export default AttachmentEditorStore;
