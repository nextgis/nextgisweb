import { makeAutoObservable, toJS } from "mobx";
import isEqual from "lodash-es/isEqual";

import { findAttachmentIndex } from "./util/findAttachmentIndex";

import type {
    EditorStoreConstructorOptions,
    EditorStore as IEditorStore,
    ExtensionValue,
} from "@nextgisweb/feature-layer/type";

import type {
    FileMeta,
    UploaderMeta,
} from "@nextgisweb/file-upload/file-uploader/type";
import type { DataSource, FileMetaToUpload } from "./type";

class AttachmentEditorStore
    implements IEditorStore<ExtensionValue<DataSource[]>>
{
    value: ExtensionValue<DataSource[]> = null;

    featureId: number;
    resourceId: number;

    _initValue: ExtensionValue<DataSource[]> = null;

    constructor({ parentStore }: EditorStoreConstructorOptions) {
        this.featureId = parentStore.featureId;
        this.resourceId = parentStore.resourceId;
        makeAutoObservable(this, { featureId: false, resourceId: false });
    }

    get counter() {
        return this.value && String(this.value.length);
    }

    get dirty() {
        if (this.value && this._initValue) {
            if (this.value.length !== this._initValue.length) {
                return true;
            }
            return !this._initValue.every((val, index) =>
                isEqual(val, this.value[index])
            );
        }
        return false;
    }

    load = (value: ExtensionValue<DataSource[]>) => {
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

    updateItem = (item: FileMeta, field: string, value: unknown) => {
        const old = [...this.value];
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

    deleteItem = (item: FileMeta) => {
        const old = [...this.value];
        const index = findAttachmentIndex(item, old);
        if (index !== -1) {
            const newAttachments = old;
            newAttachments.splice(index, 1);
            this.value = newAttachments;
        }
    };
}

export default AttachmentEditorStore;
