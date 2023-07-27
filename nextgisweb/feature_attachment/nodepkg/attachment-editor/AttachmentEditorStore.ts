import { makeAutoObservable } from "mobx";

import { findAttachmentIndex } from "./util/findAttachmentIndex";

import type {
    EditorStoreConstructorOptions,
    EditorStore as IEditorStore,
    WidgetValue,
} from "@nextgisweb/feature-layer/type";

import type {
    FileMeta,
    UploaderMeta,
} from "@nextgisweb/file-upload/file-uploader/type";
import type { DataSource, FileMetaToUpload } from "./type";

class AttachmentEditorStore implements IEditorStore<DataSource[]> {
    value: WidgetValue<DataSource[]> = null;

    featureId: number;
    resourceId: number;

    constructor({ featureId, resourceId }: EditorStoreConstructorOptions) {
        this.featureId = featureId;
        this.resourceId = resourceId;
        makeAutoObservable(this, { featureId: false, resourceId: false });
    }

    load(value: WidgetValue<DataSource[]>) {
        this.value = value;
    }

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
