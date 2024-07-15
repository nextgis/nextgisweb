import { action, computed, observable } from "mobx";

import type {
    BasemapLayerCreate,
    BasemapLayerRead,
    BasemapLayerUpdate,
} from "@nextgisweb/basemap/type/api";
import { mapper } from "@nextgisweb/gui/arm";
import type { ErrorResult } from "@nextgisweb/gui/arm";
import type { EditorStore } from "@nextgisweb/resource/type/EditorStore";

const {
    copyright_text,
    copyright_url,
    qms,
    url,
    $load: layerLoad,
    $error: mapperError,
} = mapper<LayerStore, BasemapLayerRead>({
    properties: { url: { required: true, url: true } },
});

export class LayerStore
    implements
        EditorStore<BasemapLayerRead, BasemapLayerCreate, BasemapLayerUpdate>
{
    readonly identity = "basemap_layer";

    readonly copyright_text = copyright_text.init("", this);
    readonly copyright_url = copyright_url.init(null, this);
    readonly qms = qms.init(null, this);
    readonly url = url.init("", this);

    @observable accessor loaded = false;

    @observable accessor dirty = false;

    @action load(value: BasemapLayerRead) {
        layerLoad(this, value);
        this.loaded = true;
    }

    dump(): BasemapLayerCreate | BasemapLayerUpdate | undefined {
        const result: Partial<BasemapLayerCreate | BasemapLayerUpdate> = {
            ...this.copyright_text.jsonPart(),
            ...this.copyright_url.jsonPart(),
            ...this.url.jsonPart(),
            ...this.qms.jsonPart(),
        };
        return result;
    }

    get error(): ErrorResult {
        return mapperError(this);
    }

    @action markDirty() {
        this.dirty = true;
    }

    @computed get isValid(): boolean {
        return true;
    }
}
