import { isEqual } from "lodash-es";
import { makeAutoObservable, toJS } from "mobx";

import type { ExtentRowValue } from "@nextgisweb/gui/component";
import type {
    EditorStore,
    EditorStoreOptions,
} from "@nextgisweb/resource/type";
import type { Composite } from "@nextgisweb/resource/type/Composite";
import type { ResourceRef } from "@nextgisweb/resource/type/api";
import type * as apitype from "@nextgisweb/webmap/type/api";

type WithoutItems<T> = Omit<T, "root_item" | "draw_order_enabled">;

export class SettingStore
    implements
        EditorStore<apitype.WebMapRead, WithoutItems<apitype.WebMapUpdate>>
{
    readonly identity = "webmap";
    readonly composite: Composite;

    editable = false;
    annotationEnabled = false;
    annotationDefault: apitype.WebMapRead["annotation_default"] = "no";
    legendSymbols: apitype.WebMapRead["legend_symbols"] = null;
    measureSrs: null | number = null;
    extent: ExtentRowValue = {
        left: -180,
        right: 180,
        bottom: -90,
        top: 90,
    };
    extentConst: ExtentRowValue = {
        left: null,
        right: null,
        bottom: null,
        top: null,
    };
    bookmarkResource?: ResourceRef | null = null;

    private _initValue: Partial<WithoutItems<apitype.WebMapRead>> = {
        extent_bottom: -90,
        extent_left: -180,
        extent_right: 180,
        extent_top: 90,
    };

    constructor({ composite }: EditorStoreOptions) {
        this.composite = composite;

        makeAutoObservable<SettingStore, "_initValue">(this, {
            identity: false,
            _initValue: false,
        });
    }

    load(val: apitype.WebMapRead) {
        const { root_item, draw_order_enabled, ...value } = val;
        this._initValue = value;
        this.editable = value.editable;
        this.annotationEnabled = value.annotation_enabled;
        this.annotationDefault = value.annotation_default;
        this.legendSymbols = value.legend_symbols;
        this.measureSrs = value.measure_srs ? value.measure_srs.id : null;
        this.extent = {
            left: value.extent_left,
            right: value.extent_right,
            bottom: value.extent_bottom,
            top: value.extent_top,
        };
        this.extentConst = {
            left: value.extent_const_left,
            right: value.extent_const_right,
            bottom: value.extent_const_bottom,
            top: value.extent_const_top,
        };
        this.bookmarkResource = value.bookmark_resource;
    }

    get deserializeValue(): WithoutItems<apitype.WebMapUpdate> {
        return toJS({
            editable: this.editable,
            annotation_enabled: this.annotationEnabled,
            annotation_default: this.annotationDefault,
            legend_symbols: this.legendSymbols,
            extent_bottom: this.extent.bottom,
            extent_left: this.extent.left,
            extent_right: this.extent.right,
            extent_top: this.extent.top,
            extent_const_bottom: this.extentConst.bottom,
            extent_const_left: this.extentConst.left,
            extent_const_right: this.extentConst.right,
            extent_const_top: this.extentConst.top,
            measure_srs: this.measureSrs ? { id: this.measureSrs } : undefined,
            bookmark_resource: this.bookmarkResource,
        });
    }

    dump() {
        return this.dirty ? this.deserializeValue : undefined;
    }

    get isValid() {
        return true;
    }

    get dirty(): boolean {
        if (this.deserializeValue && this._initValue) {
            const { measure_srs, ...value } = this.deserializeValue;
            const { measure_srs: measure_srs_init, ...initValue } =
                this._initValue;
            if (value && initValue) {
                const isValuesEqual = !isEqual(
                    { measureSrsId: measure_srs_init?.id, ...value },
                    { measureSrsId: measure_srs?.id, ...initValue }
                );
                return isValuesEqual;
            }
        }
        return false;
    }

    setExtent(value: ExtentRowValue) {
        this.extent = value;
    }

    setConstrainedExtent(value: ExtentRowValue) {
        this.extentConst = value;
    }

    update(source: Partial<this>) {
        Object.entries(source).forEach(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ([key, value]) => ((this as any)[key] = value)
        );
    }
}
