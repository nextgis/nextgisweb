import { computed, observable } from "mobx";

import { mapper, validate } from "@nextgisweb/gui/arm";
import type { RasterLayerStorageRead } from "@nextgisweb/raster-layer/type/api";
import type { EditorStore } from "@nextgisweb/resource/type";

const {
  endpoint,
  bucket,
  access_key,
  secret_key,
  prefix,
  $load: load,
  $error: error,
  $dirty: dirty,
} = mapper<StorageStore, Required<RasterLayerStorageRead>>({
  validateIf: (o) => o.validate,
});

endpoint.validate(validate.string({ minLength: 1 }));
bucket.validate(validate.string({ minLength: 1 }));
access_key.validate(validate.string({ minLength: 1 }));
secret_key.validate(validate.string({ minLength: 1 }));

export class StorageStore implements EditorStore<RasterLayerStorageRead> {
  readonly identity = "raster_layer_storage";

  readonly endpoint = endpoint.init("", this);
  readonly bucket = bucket.init("", this);
  readonly access_key = access_key.init("", this);
  readonly secret_key = secret_key.init("", this);
  readonly prefix = prefix.init("", this);

  @observable.ref accessor validate = false;

  load(value: RasterLayerStorageRead) {
    load(this, value);
  }

  dump(): RasterLayerStorageRead | undefined {
    if (!this.dirty) return undefined;
    return {
      ...this.endpoint.jsonPart(),
      ...this.bucket.jsonPart(),
      ...this.access_key.jsonPart(),
      ...this.secret_key.jsonPart(),
      ...this.prefix.jsonPart(),
    };
  }

  @computed
  get dirty(): boolean {
    return dirty(this);
  }

  @computed
  get isValid(): boolean {
    return error(this) === false;
  }
}
