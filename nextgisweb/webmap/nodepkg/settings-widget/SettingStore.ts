import { isEqual } from "lodash-es";
import { action, computed, observable, toJS } from "mobx";

import type { ExtentRowValue } from "@nextgisweb/gui/component";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
    EditorStore,
    EditorStoreOptions,
} from "@nextgisweb/resource/type";
import type { ResourceRef } from "@nextgisweb/resource/type/api";
import type {
    ExtentWSEN,
    WebMapRead,
    WebMapUpdate,
} from "@nextgisweb/webmap/type/api";

type WithoutItems<T> = Omit<T, "root_item" | "draw_order_enabled">;
type AnnotationDefault = WebMapRead["annotation_default"];

function convertExtentToArray(
    extent: ExtentRowValue
): ExtentWSEN | null | undefined {
    const { left, bottom, right, top } = extent;

    if (
        [left, bottom, right, top].some(
            (value) => value === undefined || value === null
        )
    ) {
        return null;
    }

    return [left, bottom, right, top] as ExtentWSEN;
}

function extractExtent(
    extentArray?: (number | null | undefined)[] | null
): ExtentRowValue {
    return {
        left: extentArray?.[0] ?? null,
        bottom: extentArray?.[1] ?? null,
        right: extentArray?.[2] ?? null,
        top: extentArray?.[3] ?? null,
    };
}

export class SettingStore
    implements EditorStore<WebMapRead, WithoutItems<WebMapUpdate>>
{
    readonly identity = "webmap";
    readonly composite: CompositeStore;

    @observable.ref accessor editable = false;
    @observable.ref accessor annotationEnabled = false;
    @observable.ref accessor annotationDefault: AnnotationDefault = "no";
    @observable.ref accessor legendSymbols: WebMapRead["legend_symbols"] = null;
    @observable.ref accessor measureSrs: null | number = null;
    @observable.shallow accessor extent: ExtentRowValue = {
        left: -180,
        right: 180,
        bottom: -90,
        top: 90,
    };
    @observable.shallow accessor extentConst: ExtentRowValue = {
        left: null,
        right: null,
        bottom: null,
        top: null,
    };
    @observable.ref accessor title: string | null = null;
    @observable.ref accessor bookmarkResource: ResourceRef | null = null;
    @observable.shallow accessor options: WebMapRead["options"] = {};

    private _initValue: Partial<WithoutItems<WebMapRead>> = {
        initial_extent: [-90, -180, 180, 90],
    };

    constructor({ composite }: EditorStoreOptions) {
        this.composite = composite;
    }

    @action
    load(val: WebMapRead) {
        const { root_item, draw_order_enabled, ...value } = val;
        this._initValue = value;
        this.editable = value.editable;
        this.annotationEnabled = value.annotation_enabled;
        this.annotationDefault = value.annotation_default;
        this.legendSymbols = value.legend_symbols;
        this.measureSrs = value.measure_srs ? value.measure_srs.id : null;
        this.extent = extractExtent(value.initial_extent);
        this.extentConst = extractExtent(value.constraining_extent);
        this.title = value.title;
        this.bookmarkResource = value.bookmark_resource;
        this.options = value.options;
    }

    @computed
    get deserializeValue(): WithoutItems<WebMapUpdate> {
        return toJS({
            editable: this.editable,
            annotation_enabled: this.annotationEnabled,
            annotation_default: this.annotationDefault,
            legend_symbols: this.legendSymbols,
            initial_extent: convertExtentToArray(this.extent),
            constraining_extent: convertExtentToArray(this.extentConst),
            title: this.title ? this.title : null,
            measure_srs: this.measureSrs ? { id: this.measureSrs } : undefined,
            bookmark_resource: this.bookmarkResource,
            options: this.options,
        });
    }

    dump() {
        return this.dirty ? this.deserializeValue : undefined;
    }

    @computed
    get isValid() {
        return true;
    }

    @computed
    get dirty(): boolean {
        if (this.deserializeValue && this._initValue) {
            const deserialized = this.deserializeValue;
            const initValueFiltered = Object.keys(deserialized).reduce(
                (acc, key) => {
                    if (key in this._initValue) {
                        const value =
                            this._initValue[
                                key as keyof WithoutItems<WebMapRead>
                            ];
                        (acc as Record<string, unknown>)[key] = value;
                    }
                    return acc;
                },
                {} as Partial<WithoutItems<WebMapRead>>
            );

            const isValuesEqual = !isEqual(
                {
                    ...deserialized,
                    measure_srs: deserialized.measure_srs?.id,
                },
                {
                    ...initValueFiltered,
                    measure_srs: initValueFiltered.measure_srs?.id,
                }
            );

            return isValuesEqual;
        }
        return false;
    }

    @action
    setExtent(value: ExtentRowValue) {
        this.extent = value;
    }

    @action
    setConstrainedExtent(value: ExtentRowValue) {
        this.extentConst = value;
    }

    @action
    setOption(identity: string, value: boolean | undefined) {
        if (value === undefined) {
            delete this.options[identity];
        } else {
            this.options[identity] = value;
        }
    }

    @action
    update(source: Partial<this>) {
        Object.assign(this, source);
    }
}
