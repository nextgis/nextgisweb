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

function convertExtentToArray(
    extent: ExtentRowValue
): apitype.ExtentWSEN | null | undefined {
    const { left, bottom, right, top } = extent;

    if (
        [left, bottom, right, top].some(
            (value) => value === undefined || value === null
        )
    ) {
        return undefined;
    }

    return [left, bottom, right, top] as apitype.ExtentWSEN;
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
    title: string | null = null;
    bookmarkResource?: ResourceRef | null = null;

    private _initValue: Partial<WithoutItems<apitype.WebMapRead>> = {
        initial_extent: [-90, -180, 180, 90],
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
        this.extent = extractExtent(value.initial_extent);
        this.extentConst = extractExtent(value.constraining_extent);
        this.title = value.title;
        this.bookmarkResource = value.bookmark_resource;
    }

    get deserializeValue(): WithoutItems<apitype.WebMapUpdate> {
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
