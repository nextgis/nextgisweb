import { computed, observable } from "mobx";

import { mapper, validate } from "@nextgisweb/gui/arm";
import type { RasterLayerStorageRead } from "@nextgisweb/raster-layer/type/api";
import type { EditorStore } from "@nextgisweb/resource/type";

type StorageFormData = Required<RasterLayerStorageRead> & {
    no_sign_request: boolean;
};

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
} = mapper<StorageStore, StorageFormData>({
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
    this.no_sign_request.load(value.access_key === null);
  }

  dump(): RasterLayerStorageRead | undefined {
    if (!this.dirty) return undefined;
    const result: RasterLayerStorageRead = {
      ...this.endpoint.jsonPart(),
      ...this.bucket.jsonPart(),
      ...this.prefix.jsonPart(),
    };
    if (this.no_sign_request.value) {
      result.access_key = null;
      result.secret_key = null;
    } else {
      Object.assign(result, {
        ...this.access_key.jsonPart(),
        ...this.secret_key.jsonPart(),
      });
    }
    return result;
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
