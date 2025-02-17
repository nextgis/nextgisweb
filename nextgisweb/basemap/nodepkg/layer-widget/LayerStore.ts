import { isEqual } from "lodash-es";
import { action, computed, observable, runInAction } from "mobx";

import type {
    BasemapLayerCreate,
    BasemapLayerRead,
    BasemapLayerUpdate,
} from "@nextgisweb/basemap/type/api";
import { mapper } from "@nextgisweb/gui/arm";
import type { EditorStore } from "@nextgisweb/resource/type/EditorStore";

const {
    copyright_text,
    copyright_url,
    qms,
    url,
    $load: layerLoad,
    $error: mapperError,
} = mapper<LayerStore, BasemapLayerRead>({
    validateIf: (o) => o.validate,
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
    @observable accessor validate = false;

    private _initValue?: BasemapLayerRead | undefined;

    @action load(value: BasemapLayerRead) {
        layerLoad(this, value);
        this._initValue = { ...value };
        this.loaded = true;
    }

    @computed get deserializeValue(): Partial<
        BasemapLayerCreate | BasemapLayerUpdate
    > {
        return {
            ...this.copyright_text.jsonPart(),
            ...this.copyright_url.jsonPart(),
            ...this.url.jsonPart(),
            ...this.qms.jsonPart(),
        };
    }

    dump(): BasemapLayerCreate | BasemapLayerUpdate | undefined {
        return this.dirty ? this.deserializeValue : undefined;
    }

    @computed get dirty(): boolean {
        if (this.deserializeValue && this._initValue) {
            return !isEqual(this.deserializeValue, this._initValue);
        }
        return true;
    }

    @computed get isValid() {
        runInAction(() => {
            this.validate = true;
        });
        return !mapperError(this);
    }
}
