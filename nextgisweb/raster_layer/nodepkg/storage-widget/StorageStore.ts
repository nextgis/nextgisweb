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
  no_sign_request,
  $load: load,
  $error: error,
  $dirty: dirty,
} = mapper<StorageStore, Required<RasterLayerStorageRead>>({
  validateIf: (o) => o.validate,
});

endpoint.validate(validate.string({ minLength: 1 }));
bucket.validate(validate.string({ minLength: 1 }));
access_key.validate((value, o: StorageStore) =>
  !o.no_sign_request.value
    ? validate.string({ minLength: 1 })(value ?? "", o)
    : [true, undefined]
);
secret_key.validate((value, o: StorageStore) =>
  !o.no_sign_request.value
    ? validate.string({ minLength: 1 })(value ?? "", o)
    : [true, undefined]
);

export class StorageStore implements EditorStore<RasterLayerStorageRead> {
  readonly identity = "raster_layer_storage";

  readonly endpoint = endpoint.init("", this);
  readonly bucket = bucket.init("", this);
  readonly access_key = access_key.init("", this);
  readonly secret_key = secret_key.init("", this);
  readonly prefix = prefix.init("", this);
  readonly no_sign_request = no_sign_request.init(false, this);

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
      ...this.no_sign_request.jsonPart(),
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
