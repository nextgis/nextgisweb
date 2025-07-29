import { action, computed, observable } from "mobx";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { route } from "@nextgisweb/pyramid/api";
import type { RouteBody } from "@nextgisweb/pyramid/api/type";
import { AbortControllerHelper } from "@nextgisweb/pyramid/util/abort";
import type { CompositeRead } from "@nextgisweb/resource/type/api";
import type { VectorLayerRead } from "@nextgisweb/vector-layer/type/api";

import type { NgwAttributeValue } from "../attribute-editor/type";
import type {
    EditorStore,
    FeatureItemExtensions,
    FeatureItem as FeatureItem_,
} from "../type";

import type { FeatureEditorStoreOptions } from "./type";

type FeatureItem = FeatureItem_<NgwAttributeValue>;
type ExtensionStores = Record<string, EditorStore>;

export class FeatureEditorStore {
    readonly resourceId: number;
    readonly featureId: number | null = null;

    @observable.ref accessor saving = false;
    @observable.ref accessor initLoading = false;
    @observable.ref accessor skipDirtyCheck = false;

    @observable.shallow accessor fields: FeatureLayerFieldRead[] = [];
    @observable.shallow accessor vectorLayer: VectorLayerRead | null = null;

    private _featureItem?: FeatureItem;

    private _abortController = new AbortControllerHelper();

    @observable.shallow private accessor _attributeStore: EditorStore | null =
        null;
    @observable.shallow private accessor _geometryStore: EditorStore | null =
        null;
    @observable.shallow private accessor _extensionStores: ExtensionStores = {};

    constructor({
        resourceId,
        featureId,
        skipDirtyCheck,
    }: FeatureEditorStoreOptions) {
        if (skipDirtyCheck !== undefined) {
            this.skipDirtyCheck = skipDirtyCheck;
        }
        this.resourceId = resourceId;
        this.featureId = featureId;

        this.setInitLoading(true);
        this._initialize().finally(() => {
            this.setInitLoading(false);
        });
    }

    @computed
    get dirty(): boolean {
        if (this.skipDirtyCheck) {
            return true;
        }
        const stores: { dirty: boolean }[] = [];
        if (this._attributeStore) stores.push(this._attributeStore);
        if (this._geometryStore) stores.push(this._geometryStore);
        stores.push(...Object.values(this._extensionStores));

        return stores.some(({ dirty }) => dirty);
    }

    @action
    setInitLoading(initLoading: boolean): void {
        this.initLoading = initLoading;
    }
    @action
    setFields(fields: FeatureLayerFieldRead[]): void {
        this.fields = fields;
    }
    @action
    setVectorLayer(vectorLayer: VectorLayerRead | null): void {
        this.vectorLayer = vectorLayer;
    }
    @action
    setSaving(saving: boolean): void {
        this.saving = saving;
    }

    private async _initialize() {
        this._abort();

        const signal = this._abortController.makeSignal();

        const resp = await route("resource.item", this.resourceId).get({
            signal,
        });
        if (resp) {
            const fields = resp.feature_layer && resp.feature_layer.fields;
            if (fields) {
                this.setFields(fields);
            }
            this.setVectorLayer(resp.vector_layer ?? null);
        }

        if (typeof this.featureId === "number") {
            const featureItem = await route("feature_layer.feature.item", {
                id: this.resourceId,
                fid: this.featureId,
            }).get<FeatureItem>({
                signal,
                query: { dt_format: "iso" },
            });
            this._setFeatureItem(featureItem);
        }
        return resp;
    }

    preparePayload = () => {
        const extensions: Record<string, unknown> = {};
        for (const key in this._extensionStores) {
            const storeExtension = this._extensionStores[key];
            extensions[key] = storeExtension.value;
        }

        const json:
            | RouteBody<"feature_layer.feature.item", "put">
            | RouteBody<"feature_layer.feature.collection", "patch"> = {
            extensions,
        };

        if (this._attributeStore && this._attributeStore.dirty) {
            json.fields = this._attributeStore.value;
        }
        if (this._geometryStore && this._geometryStore.dirty) {
            json.geom = this._geometryStore.value;
        }
        return json;
    };

    @action.bound
    async save(): Promise<CompositeRead | undefined> {
        try {
            this.setSaving(true);
            const json = this.preparePayload();
            if (typeof this.featureId !== "number") {
                await route("feature_layer.feature.collection", {
                    id: this.resourceId,
                }).patch({
                    // @ts-expect-error TODO: define patch payload for feature_layer.feature.collection
                    json: [json],
                    query: { dt_format: "iso" },
                });
            } else {
                await route("feature_layer.feature.item", {
                    id: this.resourceId,
                    fid: this.featureId,
                }).put({
                    query: { dt_format: "iso" },
                    json,
                });
            }
            // To update initial feature value
            const resp = await this._initialize();
            return resp;
        } finally {
            this.setSaving(false);
        }
    }

    @action.bound
    destroy() {
        this._abort();
    }

    @action.bound
    attachAttributeStore(attributeStore: EditorStore) {
        this._attributeStore = attributeStore;
        if (this._featureItem) {
            this._setAttributesValue(this._featureItem.fields);
        }
    }
    @action.bound
    attachGeometryStore(geometryStore: EditorStore) {
        this._geometryStore = geometryStore;
        if (this._featureItem) {
            this._setGeometryValue(this._featureItem.geom);
        }
    }

    @action.bound
    addExtensionStore(key: string, extensionStore: EditorStore) {
        this._extensionStores[key] = extensionStore;
        if (this._featureItem) {
            this._setExtensionsValue(this._featureItem.extensions, {
                include: [key],
            });
        }
    }

    @action.bound
    reset() {
        this._setFeatureItem(this._featureItem);
    }

    @action
    private _setStoreValues(featureItem?: FeatureItem) {
        this._setExtensionsValue(featureItem ? featureItem.extensions : null);
        this._setAttributesValue(featureItem ? featureItem.fields : null);
        this._setGeometryValue(featureItem ? featureItem.geom : null);
    }

    private _setAttributesValue(attributes: NgwAttributeValue | null) {
        if (this._attributeStore) {
            this._attributeStore.load(attributes);
        }
    }
    private _setGeometryValue(geom: string | null) {
        if (this._geometryStore) {
            this._geometryStore.load(geom);
        }
    }

    @action
    private _setExtensionsValue(
        extensions: FeatureItemExtensions | null,
        { include }: { include?: string[] } = {}
    ) {
        for (const key in extensions) {
            if (include && !include.includes(key)) {
                continue;
            }
            const extension = extensions[key];
            const extensionStore = this._extensionStores[key];
            if (extension !== undefined && extensionStore !== undefined) {
                extensionStore.load(extension);
            }
        }
    }

    @action
    private _setFeatureItem(featureItem?: FeatureItem): void {
        this._featureItem = featureItem;
        this._setStoreValues(featureItem);
    }

    private _abort(): void {
        this._abortController.abort();
    }
}
