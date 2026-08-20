import { action, computed, observable } from "mobx";

import { mapper } from "@nextgisweb/gui/arm";
import type { NullableProps } from "@nextgisweb/gui/type";
import { assert } from "@nextgisweb/jsrealm/error";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
  EditorStore,
  EditorStoreOptions,
} from "@nextgisweb/resource/type";
import srsSettings from "@nextgisweb/spatial-ref-sys/client-settings";
import type {
  WMSLayerCreate,
  WMSLayerRead,
  WMSLayerUpdate,
} from "@nextgisweb/wmsclient/type/api";

type MapperLayerCreate = NullableProps<
  WMSLayerCreate,
  "connection" | "imgformat" | "vendor_params" | "remote_srs"
>;

const {
  connection,
  wmslayers,
  imgformat,
  vendor_params,
  remote_srs,
  $load: mapperLoad,
  $error: mapperError,
  $dump: mapperDump,
  $dirty: mapperDirty,
} = mapper<WmsClientLayerStore, MapperLayerCreate>({
  validateIf: (o) => o.validate,
  properties: {
    connection: { required: true },
    imgformat: { required: true },
    wmslayers: { required: true },
    remote_srs: { required: true },
  },
});

export class WmsClientLayerStore implements EditorStore<
  WMSLayerRead,
  WMSLayerCreate,
  WMSLayerUpdate
> {
  readonly identity = "wmsclient_layer";
  readonly composite: CompositeStore;

  readonly connection = connection.init(null, this);
  readonly wmslayers = wmslayers.init("", this);
  readonly imgformat = imgformat.init(null, this);
  readonly vendor_params = vendor_params.init({}, this);
  readonly remote_srs = remote_srs.init(null, this);

  @observable.ref accessor validate = false;

  constructor({ composite }: EditorStoreOptions) {
    this.composite = composite;
  }

  @action
  load(val: WMSLayerRead) {
    mapperLoad(this, val);
  }

  @computed
  get dirty(): boolean {
    return mapperDirty(this);
  }

  dump() {
    if (this.dirty) {
      const {
        wmslayers,
        imgformat,
        connection,
        vendor_params,
        remote_srs,
        ...rest
      } = mapperDump(this);

      assert(
        connection && imgformat && vendor_params && wmslayers && remote_srs
      );

      return {
        wmslayers,
        imgformat,
        connection,
        vendor_params,
        remote_srs,
        ...rest,
        ...(this.composite.operation === "create"
          ? { srs: srsSettings.default }
          : {}),
      };
    }
  }

  @computed
  get error() {
    return mapperError(this);
  }

  @computed
  get isValid() {
    return !this.error;
  }
}
