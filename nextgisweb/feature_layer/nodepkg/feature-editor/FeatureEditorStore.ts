import { makeAutoObservable, runInAction, toJS } from "mobx";

import { route } from "@nextgisweb/pyramid/api";
import { AbortControllerHelper } from "@nextgisweb/pyramid/util/abort";

import { message } from "@nextgisweb/gui/antd";

import i18n from "@nextgisweb/pyramid/i18n";

import type { ResourceItem } from "@nextgisweb/resource/type";
import type {
    FeatureLayerField,
    FeatureItemExtensions,
} from "@nextgisweb/feature-layer/type";
import type { FeatureEditorStoreOptions } from "./type";
import type { FeatureItem as FeatureItem_, EditorStore } from "../type";
import { NgwAttributeValue } from "../attribute-editor/type";

type FeatureItem = FeatureItem_<NgwAttributeValue>;

const saveSuccessMsg = i18n.gettext("Feature saved");

export class FeatureEditorStore {
    resourceId: number;
    featureId: number;

    saving = false;

    initLoading = false;

    private _resourceItem: ResourceItem | null = null;
    private _featureItem: FeatureItem | null = null;

    _abortController = new AbortControllerHelper();
    private _extensionStores: Record<string, EditorStore> = {};
    private _attributeStore: EditorStore | null = null;

    constructor({ resourceId, featureId }: FeatureEditorStoreOptions) {
        if (resourceId === undefined) {
            throw new Error(
                "`resourceId` is required attribute for FeatureEditorStore"
            );
        }

        this.resourceId = resourceId;
        this.featureId = featureId;

        makeAutoObservable(this, { _abortController: false, route: false });

        this._initialize();
    }

    get fields(): FeatureLayerField[] {
        const fields =
            this._resourceItem &&
            this._resourceItem.feature_layer &&
            this._resourceItem.feature_layer.fields;
        return fields ?? [];
    }

    get route() {
        return route(
            "feature_layer.feature.item",
            this.resourceId,
            this.featureId
        );
    }

    _initialize = async () => {
        this._abort();
        try {
            const signal = this._abortController.makeSignal();
            runInAction(() => {
                this.initLoading = true;
            });
            const resp = await route("resource.item", this.resourceId).get({
                signal,
            });
            runInAction(() => {
                this._resourceItem = resp;
            });
            if (this.featureId !== undefined) {
                const featureItem = await this.route.get({
                    signal,
                    query: { dt_format: "iso" },
                });
                this._setFeatureItem(featureItem);
            }
        } finally {
            runInAction(() => {
                this.initLoading = false;
            });
        }
    };

    save = async () => {
        const extensions: Record<string, unknown> = {};
        for (const key in this._extensionStores) {
            const storeExtension = this._extensionStores[key];
            extensions[key] = toJS(storeExtension.value);
        }
        const fields = this._attributeStore
            ? toJS(this._attributeStore.value)
            : {};
        runInAction(() => {
            this.saving = true;
        });
        try {
            await this.route.put({
                query: { dt_format: "iso" },
                json: {
                    fields,
                    extensions,
                },
            });
            // To update initial feature value
            this._initialize();
            message.success(saveSuccessMsg);
        } finally {
            runInAction(() => {
                this.saving = false;
            });
        }
    };

    destroy = () => {
        this._abort();
    };

    attachAttributeStore = (attributeStore: EditorStore) => {
        this._attributeStore = attributeStore;
        if (this._featureItem) {
            this._setAttributesValue(this._featureItem.fields);
        }
    };

    addExtensionStore = (key: string, extensionStore: EditorStore) => {
        this._extensionStores[key] = extensionStore;
        this._setExtensionsValue(this._featureItem.extensions, {
            include: [key],
        });
    };

    reset = () => {
        if (this._featureItem) {
            this._setFeatureItem(this._featureItem);
        }
    };

    private _setStoreValues(featureItem: FeatureItem) {
        this._setExtensionsValue(featureItem.extensions);
        this._setAttributesValue(featureItem.fields);
    }

    private _setAttributesValue(attributes: NgwAttributeValue) {
        if (this._attributeStore) {
            this._attributeStore.load(attributes);
        }
    }

    private _setExtensionsValue(
        extensions: FeatureItemExtensions,
        { include }: { include?: string[] } = {}
    ) {
        for (const key in extensions) {
            if (include) {
                if (!include.includes(key)) {
                    continue;
                }
            }
            const extension = extensions[key];
            const extensionStore = this._extensionStores[key];
            if (extension && extensionStore) {
                extensionStore.load(extension);
            }
        }
    }

    private _setFeatureItem(featureItem: FeatureItem): void {
        runInAction(() => {
            this._featureItem = featureItem;
        });
        this._setStoreValues(featureItem);
    }

    private _abort(): void {
        this._abortController.abort();
    }
}
