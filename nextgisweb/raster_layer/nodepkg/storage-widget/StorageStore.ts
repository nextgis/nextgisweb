import { computed, observableRef } from "mobx";

import { mapper, validate } from "@nextgisweb/gui/arm";
import type { RasterLayerStorageRead } from "@nextgisweb/raster-layer/type/api";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
  EditorStore,
  EditorStoreOptions,
} from "@nextgisweb/resource/type";

type StorageFormData = Required<RasterLayerStorageRead> & {
  no_sign_request: boolean;
  kind: string;
};

const {
  kind,
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

endpoint.validate((value, o: StorageStore) =>
  o.kind.value === "gcp"
    ? [true, undefined]
    : validate.string({ minLength: 1 })(value ?? "", o)
);
bucket.validate((value, o: StorageStore) =>
  o.kind.value === "http"
    ? [true, undefined]
    : validate.string({ minLength: 1 })(value ?? "", o)
);
access_key.validate((value, o: StorageStore) =>
  o.kind.value === "http" || o.no_sign_request.value
    ? [true, undefined]
    : validate.string({ minLength: 1 })(value ?? "", o)
);
secret_key.validate((value, o: StorageStore) =>
  o.kind.value === "http" || o.no_sign_request.value
    ? [true, undefined]
    : validate.string({ minLength: 1 })(value ?? "", o)
);

export class StorageStore implements EditorStore<RasterLayerStorageRead> {
  readonly identity = "raster_layer_storage";

  readonly composite: CompositeStore;

  constructor({ composite }: EditorStoreOptions) {
    this.composite = composite;
  }

  readonly kind = kind.init("s3", this);
  readonly endpoint = endpoint.init("", this);
  readonly bucket = bucket.init("", this);
  readonly access_key = access_key.init("", this);
  readonly secret_key = secret_key.init("", this);
  readonly prefix = prefix.init("", this);
  readonly no_sign_request = no_sign_request.init(false, this);

  @observableRef accessor validate = false;

  load(value: RasterLayerStorageRead) {
    load(this, value);
    this.no_sign_request.load(value.access_key === null);
  }

  dump(): RasterLayerStorageRead | undefined {
    if (!this.dirty) return undefined;
    const result: RasterLayerStorageRead = {
      ...this.kind.jsonPart(),
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
