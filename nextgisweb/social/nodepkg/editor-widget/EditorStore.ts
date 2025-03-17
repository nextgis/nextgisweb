import { action, computed, observable } from "mobx";

import type { UploaderMeta } from "@nextgisweb/file-upload/file-uploader";
import { routeURL } from "@nextgisweb/pyramid/api";
import type {
    EditorStoreOptions,
    EditorStore as IEditorStore,
} from "@nextgisweb/resource/type";
import type apitype from "@nextgisweb/social/type/api";

export class EditorStore
    implements IEditorStore<apitype.SocialRead, apitype.SocialUpdate>
{
    identity = "social";
    readonly resourceId: number;

    @observable.ref accessor imageExisting: Blob | null = null;
    @observable.ref accessor imageUpdated: UploaderMeta | null = null;
    @observable.ref accessor description: string | null = null;

    @observable.ref accessor dirty = false;

    constructor({ resourceId }: EditorStoreOptions) {
        if (resourceId === undefined) {
            throw new Error("The `resourceId` is required parameter");
        }
        this.resourceId = resourceId;
    }

    load(value: apitype.SocialRead) {
        this.imageUpdated = null;
        if (value) {
            if (value.image_exists) {
                this.imageExisting = null;
                fetch(routeURL("resource.preview", this.resourceId)).then(
                    (resp) => {
                        resp.blob().then((data) => {
                            this.imageExisting = data;
                        });
                    }
                );
            }

            this.description = value.description;
        }
        this.dirty = false;
    }

    dump(): apitype.SocialUpdate | undefined {
        if (!this.dirty) return undefined;
        const result: apitype.SocialUpdate = {
            description: this.description ? this.description : null,
        };

        if (this.imageUpdated && this.imageUpdated !== null) {
            result.file_upload = this.imageUpdated as UploaderMeta<false>;
        }

        if (this.imageExisting === null && this.imageUpdated === null) {
            result.file_upload = null;
        }

        return result;
    }

    @computed
    get isValid() {
        return this.imageExisting !== undefined;
    }

    @action
    update(data: Partial<EditorStore>) {
        for (const [k, v] of Object.entries(data)) {
            if (k in this) {
                (this as any)[k] = v;
            }
        }
        this.dirty = true;
    }
}
