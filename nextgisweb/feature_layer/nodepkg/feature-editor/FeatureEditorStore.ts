import { makeAutoObservable, runInAction, toJS } from "mobx";

import type {
    FeatureItemExtensions,
    FeatureLayerField,
} from "@nextgisweb/feature-layer/type";
import { message } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { AbortControllerHelper } from "@nextgisweb/pyramid/util/abort";
import type { ResourceItem } from "@nextgisweb/resource/type/Resource";

import type { NgwAttributeValue } from "../attribute-editor/type";
import type { EditorStore, FeatureItem as FeatureItem_ } from "../type";

import type { FeatureEditorStoreOptions } from "./type";

type FeatureItem = FeatureItem_<NgwAttributeValue>;

const msgSaved = gettext("Feature saved");
const msgNoChanges = gettext("No changes to save");

export class FeatureEditorStore {
    resourceId: number;
    featureId: number;

    saving = false;

    initLoading = false;
    fields: FeatureLayerField[] = [];

    private _featureItem?: FeatureItem;

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

    get route() {
        return route("feature_layer.feature.item", {
            id: this.resourceId,
            fid: this.featureId,
        });
    }

    get dirty(): boolean {
        const attributesDirty =
            this._attributeStore && this._attributeStore.dirty;
        const extensionsDirty = Object.values(this._extensionStores)
            .filter((s) => s.dirty !== undefined)
            .some((s) => s.dirty);

        return attributesDirty || extensionsDirty;
    }

    private _initialize = async () => {
        this._abort();
        try {
            const signal = this._abortController.makeSignal();
            runInAction(() => {
                this.initLoading = true;
            });
            const resp = await route(
                "resource.item",
                this.resourceId
            ).get<ResourceItem>({
                signal,
            });
            runInAction(() => {
                const fields =
                    resp && resp.feature_layer && resp.feature_layer.fields;
                if (fields) {
                    this.fields = fields;
                }
            });
            if (this.featureId !== undefined) {
                const featureItem = await this.route.get<FeatureItem>({
                    signal,
                    query: { dt_format: "iso" },
                });
                this._setFeatureItem(featureItem);
            }
            return resp;
        } finally {
            runInAction(() => {
                this.initLoading = false;
            });
        }
    };

    save = async () => {
        if (!this.dirty) {
            message.success(msgNoChanges);
            return;
        }

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
            const resp = await this._initialize();
            message.success(msgSaved);
            return resp;
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
        if (this._featureItem) {
            this._setExtensionsValue(this._featureItem.extensions, {
                include: [key],
            });
        }
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
            if (extension !== undefined && extensionStore !== undefined) {
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
