import { action, computed, observableRef } from "mobx";

import type {
  BasemapLayerCreate,
  BasemapLayerRead,
  BasemapLayerUpdate,
} from "@nextgisweb/basemap/type/api";
import { mapper } from "@nextgisweb/gui/arm";
import type { EditorStore } from "@nextgisweb/resource/type";

const {
  qms,
  url,
  type,
  epsg,
  copyright_text: copyrightText,
  copyright_url: copyrightUrl,
  z_min: minzoom,
  z_max: maxzoom,
  $load: mapperLoad,
  $dump: mapperDump,
  $dirty: mapperDirty,
  $error: mapperError,
} = mapper<LayerStore, BasemapLayerRead>({
  validateIf: (o) => o.validate,
  properties: {
    url: { required: true, url: true },
    epsg: { required: true },
  },
});

export class LayerStore implements EditorStore<
  BasemapLayerRead,
  BasemapLayerCreate,
  BasemapLayerUpdate
> {
  readonly identity = "basemap_layer";

  readonly url = url.init("", this);
  readonly type = type.init("tms", this);
  readonly epsg = epsg.init(3857, this);
  readonly qms = qms.init(null, this);
  readonly copyrightText = copyrightText.init("", this);
  readonly copyrightUrl = copyrightUrl.init(null, this);
  readonly minzoom = minzoom.init(null, this);
  readonly maxzoom = maxzoom.init(null, this);

  @observableRef accessor loaded = false;
  @observableRef accessor validate = false;

  @action
  load(value: BasemapLayerRead) {
    mapperLoad(this, value);
    this.loaded = true;
  }

  dump(): BasemapLayerCreate | BasemapLayerUpdate | undefined {
    return this.dirty ? mapperDump(this) : undefined;
  }

  @computed
  get dirty() {
    return mapperDirty(this);
  }

  @computed
  get isValid() {
    return !mapperError(this);
  }
}
