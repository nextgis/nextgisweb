import { action, computed, observable } from "mobx";

import type { UploaderMeta } from "@nextgisweb/file-upload/file-uploader";
import { routeURL } from "@nextgisweb/pyramid/api";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
    EditorStoreOptions,
    EditorStore as IEditorStore,
} from "@nextgisweb/resource/type";
import type apitype from "@nextgisweb/social/type/api";

export class EditorStore
    implements IEditorStore<apitype.SocialRead, apitype.SocialUpdate>
{
    readonly identity = "social";
    readonly composite: CompositeStore;

    @observable.ref accessor imageExisting: Blob | null = null;
    @observable.ref accessor imageUpdated: UploaderMeta | null = null;
    @observable.ref accessor description: string | null = null;

    @observable.ref accessor dirty = false;

    constructor({ composite }: EditorStoreOptions) {
        this.composite = composite;
    }

    load(value: apitype.SocialRead) {
        this.imageUpdated = null;
        if (value.image_exists && this.composite.resourceId !== null) {
            this.imageExisting = null;
            const url = routeURL("resource.preview", this.composite.resourceId);
            fetch(url).then((resp) => {
                resp.blob().then((data) => {
                    this.imageExisting = data;
                });
            });
        }

        this.description = value.description;
        this.dirty = false;
    }

    dump() {
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
    update(data: Partial<this>) {
        for (const [k, v] of Object.entries(data)) {
            if (k in this && this[k as keyof this] !== (v ?? null)) {
                (this as any)[k] = v;
                if (!this.dirty) this.dirty = true;
            }
        }
    }
}
