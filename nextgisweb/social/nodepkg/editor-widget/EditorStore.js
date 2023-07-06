import { toJS, makeAutoObservable } from "mobx";

import { routeURL } from "@nextgisweb/pyramid/api";

export class EditorStore {
    identity = "social";

    imageExisting = null;
    imageUpdated = undefined;
    description = null;

    constructor({ resourceId }) {
        makeAutoObservable(this, { identity: false });
        this.resourceId = resourceId;
    }

    load(value) {
        this.imageUpdated = undefined;
        if (value.preview_image_exists) {
            this.imageExisting = undefined;
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

    dump() {
        const result = {};
        result.preview_description = this.description ? this.description : null;
        if (this.imageUpdated !== undefined) {
            result.preview_file_upload = this.imageUpdated;
        }
        return toJS(result);
    }

    get isValid() {
        return this.imageExisting !== undefined;
    }
}
