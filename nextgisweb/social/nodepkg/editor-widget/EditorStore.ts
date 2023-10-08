import { makeAutoObservable, toJS } from "mobx";

import type { UploaderMeta } from "@nextgisweb/file-upload/file-uploader";
import { routeURL } from "@nextgisweb/pyramid/api";
import type {
    EditorStoreOptions,
    EditorStore as IEditorStore,
} from "@nextgisweb/resource/type/EditorStore";

interface Value {
    preview_image_exists?: boolean;
    preview_description: string | null;
    preview_file_upload?: UploaderMeta | null;
}

export class EditorStore implements IEditorStore<Value | null> {
    identity = "social";

    imageExisting: Blob | null = null;
    imageUpdated?: UploaderMeta | null;
    description: string | null = null;

    resourceId: number;

    dirty = false;

    constructor({ resourceId }: EditorStoreOptions) {
        if (resourceId === undefined) {
            throw new Error("The `resourceId` is required parameter");
        }
        makeAutoObservable(this, { identity: false });
        this.resourceId = resourceId;
    }

    load(value: Value | null) {
        this.imageUpdated = undefined;
        if (value) {
            if (value.preview_image_exists) {
                this.imageExisting = null;
                fetch(routeURL("resource.preview", this.resourceId)).then(
                    (resp) => {
                        resp.blob().then((data) => {
                            this.imageExisting = data;
                        });
                    }
                );
            }

            this.description = value.preview_description;
        }
        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return null;
        const result: Value = {
            preview_description: this.description ? this.description : null,
        };
        if (this.imageUpdated !== undefined) {
            result.preview_file_upload = this.imageUpdated;
        }
        return toJS(result);
    }

    get isValid() {
        return this.imageExisting !== undefined;
    }

    update(data: Partial<EditorStore>) {
        for (const [k, v] of Object.entries(data)) {
            if (k in this) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (this as any)[k] = v;
            }
        }
        this.dirty = true;
    }
}
