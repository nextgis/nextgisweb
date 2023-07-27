import { makeAutoObservable } from "mobx";

import type { EditorStore as IEditorStore } from "@nextgisweb/feature-layer/type";
import type { WidgetValue } from "@nextgisweb/feature-layer/type";
import { EditorStoreConstructorOptions } from "package/nextgisweb/nextgisweb/feature_layer/nodepkg/type/EditorStore";

class EditorStore implements IEditorStore<string> {
    uploading = false;

    value: WidgetValue<string> = null;

    resourceId: number;
    featureId: number;

    constructor({ resourceId, featureId }: EditorStoreConstructorOptions) {
        this.resourceId = resourceId;
        this.featureId = featureId;
        makeAutoObservable(this, { resourceId: false, featureId: false });
    }

    load = (value: WidgetValue<string>) => {
        this.value = value;
    };
}

export default EditorStore;
