import { some } from "lodash-es";
import { action, computed, observable, toJS } from "mobx";

import type { FeatureItemExtensions } from "@nextgisweb/feature-layer/type";
import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { message } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import type { RouteBody } from "@nextgisweb/pyramid/api/type";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { AbortControllerHelper } from "@nextgisweb/pyramid/util/abort";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import type { NgwAttributeValue } from "../attribute-editor/type";
import type { EditorStore, FeatureItem as FeatureItem_ } from "../type";

import type { FeatureEditorStoreOptions } from "./type";

type FeatureItem = FeatureItem_<NgwAttributeValue>;
type ExtensionStores = Record<string, EditorStore>;

const msgSaved = gettext("Feature saved");
const msgNoChanges = gettext("No changes to save");

export class FeatureEditorStore {
    @observable accessor resourceId: number;
    @observable accessor featureId: number | null = null;

    @observable accessor saving = false;
    @observable accessor initLoading = false;

    @observable.shallow accessor fields: FeatureLayerFieldRead[] = [];

    private _featureItem?: FeatureItem;

    private _abortController = new AbortControllerHelper();

    @observable.shallow private accessor _attributeStore: EditorStore | null =
        null;
    @observable private accessor _extensionStores: ExtensionStores = {};

    constructor({ resourceId, featureId }: FeatureEditorStoreOptions) {
        if (resourceId === undefined) {
            throw new Error(
                "`resourceId` is required attribute for FeatureEditorStore"
            );
        }

        this.resourceId = resourceId;
        this.featureId = featureId;

        this.initLoading = true;
        this._initialize().finally(() => {
            this.initLoading = false;
        });
    }

    @computed
    get route() {
        if (typeof this.featureId === "number") {
            return route("feature_layer.feature.item", {
                id: this.resourceId,
                fid: this.featureId,
            });
        }
    }

    @computed
    get dirty(): boolean {
        const stores: { dirty: boolean }[] = [];
        if (this._attributeStore) stores.push(this._attributeStore);
        stores.push(...Object.values(this._extensionStores));

        return some(stores, ({ dirty }) => dirty);
    }

    @action
    private _initialize = async () => {
        this._abort();

        const signal = this._abortController.makeSignal();

        const resp = await route("resource.item", this.resourceId).get({
            signal,
        });
        const fields = resp && resp.feature_layer && resp.feature_layer.fields;
        if (fields) {
            this.fields = fields;
        }
        if (this.route) {
            const featureItem = await this.route?.get<FeatureItem>({
                signal,
                query: { dt_format: "iso" },
            });
            this._setFeatureItem(featureItem);
        }
        return resp;
    };

    preparePayload = () => {
        const extensions: Record<string, unknown> = {};
        for (const key in this._extensionStores) {
            const storeExtension = this._extensionStores[key];
            extensions[key] = toJS(storeExtension.value);
        }

        const json: RouteBody<"feature_layer.feature.item", "put"> = {
            extensions,
        };

        if (this._attributeStore && this._attributeStore.dirty) {
            json.fields = toJS(this._attributeStore.value);
        }
        return json;
    };

    @action
    save = async (): Promise<CompositeRead | undefined> => {
        if (!this.dirty) {
            message.success(msgNoChanges);
            return;
        }

        if (!this.route) {
            return;
        }

        try {
            this.saving = true;
            await this.route.put({
                query: { dt_format: "iso" },
                json: this.preparePayload(),
            });
            // To update initial feature value
            const resp = await this._initialize();
            message.success(msgSaved);
            return resp;
        } finally {
            this.saving = false;
        }
    };

    @action
    destroy = () => {
        this._abort();
    };

    @action
    attachAttributeStore = (attributeStore: EditorStore) => {
        this._attributeStore = attributeStore;
        if (this._featureItem) {
            this._setAttributesValue(this._featureItem.fields);
        }
    };

    @action
    addExtensionStore = (key: string, extensionStore: EditorStore) => {
        this._extensionStores[key] = extensionStore;
        if (this._featureItem) {
            this._setExtensionsValue(this._featureItem.extensions, {
                include: [key],
            });
        }
    };

    @action
    reset = () => {
        if (this._featureItem) {
            this._setFeatureItem(this._featureItem);
        }
    };

    @action
    private _setStoreValues(featureItem: FeatureItem) {
        this._setExtensionsValue(featureItem.extensions);
        this._setAttributesValue(featureItem.fields);
    }

    @action
    private _setAttributesValue(attributes: NgwAttributeValue) {
        if (this._attributeStore) {
            this._attributeStore.load(attributes);
        }
    }

    @action
    private _setExtensionsValue(
        extensions: FeatureItemExtensions,
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
    private _setFeatureItem(featureItem: FeatureItem): void {
        this._featureItem = featureItem;
        this._setStoreValues(featureItem);
    }

    private _abort(): void {
        this._abortController.abort();
    }
}
