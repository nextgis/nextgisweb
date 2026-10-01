import { isEqual } from "lodash-es";
import { action, computed, observableRef, observableShallow } from "mobx";

import type { ExtentRowValue } from "@nextgisweb/gui/component";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
  EditorStore,
  EditorStoreOptions,
} from "@nextgisweb/resource/type";
import type { ResourceRef } from "@nextgisweb/resource/type/api";
import type { WebMapRead, WebMapUpdate } from "@nextgisweb/webmap/type/api";

import { convertExtentToArray, extractExtentFromArray } from "../utils/extent";

type WithoutItems<T> = Omit<T, "root_item" | "draw_order_enabled">;
type AnnotationDefault = WebMapRead["annotation_default"];

export class SettingStore implements EditorStore<
  WebMapRead,
  WithoutItems<WebMapUpdate>
> {
  readonly identity = "webmap";
  readonly composite: CompositeStore;

  @observableRef accessor editable = true;
  @observableRef accessor annotationEnabled = false;
  @observableRef accessor annotationDefault: AnnotationDefault = "no";
  @observableRef accessor legendSymbols: WebMapRead["legend_symbols"] = null;
  @observableRef accessor measureSrs: null | number = null;
  @observableRef accessor initialExtent: ExtentRowValue = {
    left: -180,
    right: 180,
    bottom: -90,
    top: 90,
  };
  @observableRef accessor constrainingExtent: ExtentRowValue = {
    left: null,
    right: null,
    bottom: null,
    top: null,
  };
  @observableRef accessor title: string | null = null;
  @observableRef accessor bookmarkResource: ResourceRef | null = null;
  @observableShallow accessor options: WebMapRead["options"] = {};

  private initialValue: WithoutItems<WebMapUpdate>;

  constructor({ composite }: EditorStoreOptions) {
    this.composite = composite;
    this.initialValue = this.deserializedValue;
  }

  @action
  load(val: WebMapRead) {
    const {
      // Managed by ItemsStore
      root_item,
      draw_order_enabled,
      // Deprecated extent_*
      extent_left,
      extent_right,
      extent_bottom,
      extent_top,
      extent_const_left,
      extent_const_right,
      extent_const_bottom,
      extent_const_top,
      // Our precious
      ...value
    } = val;

    this.editable = value.editable;
    this.annotationEnabled = value.annotation_enabled;
    this.annotationDefault = value.annotation_default;
    this.legendSymbols = value.legend_symbols;
    this.measureSrs = value.measure_srs ? value.measure_srs.id : null;
    this.initialExtent = extractExtentFromArray(value.initial_extent);
    this.constrainingExtent = extractExtentFromArray(value.constraining_extent);
    this.title = value.title;
    this.bookmarkResource = value.bookmark_resource;
    this.options = { ...value.options };
    this.initialValue = this.deserializedValue;
  }

  @computed
  get deserializedValue(): WithoutItems<WebMapUpdate> {
    return {
      editable: this.editable,
      annotation_enabled: this.annotationEnabled,
      annotation_default: this.annotationDefault,
      legend_symbols: this.legendSymbols,
      initial_extent: convertExtentToArray(this.initialExtent),
      constraining_extent: convertExtentToArray(this.constrainingExtent),
      title: this.title ? this.title : null,
      measure_srs: this.measureSrs ? { id: this.measureSrs } : null,
      bookmark_resource: this.bookmarkResource,
      options: { ...this.options },
    };
  }

  dump() {
    return this.dirty ? this.deserializedValue : undefined;
  }

  @computed
  get isValid() {
    return true;
  }

  @computed
  get dirty(): boolean {
    return !isEqual(this.deserializedValue, this.initialValue);
  }

  @action
  setExtent(value: ExtentRowValue) {
    this.initialExtent = value;
  }

  @action
  setConstrainedExtent(value: ExtentRowValue) {
    this.constrainingExtent = value;
  }

  @action
  setOption(identity: string, value: boolean | undefined) {
    const options = { ...this.options };
    if (value === undefined) {
      delete options[identity];
    } else {
      options[identity] = value;
    }
    this.options = options;
  }

  @action
  update(source: Partial<this>) {
    Object.assign(this, source);
  }
}
