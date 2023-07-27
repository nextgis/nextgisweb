import { makeAutoObservable, runInAction, toJS } from "mobx";

import { route } from "@nextgisweb/pyramid/api";
import { AbortControllerHelper } from "@nextgisweb/pyramid/util/abort";

import { message } from "@nextgisweb/gui/antd";

import i18n from "@nextgisweb/pyramid/i18n";

import { parseNgwAttribute, formatNgwAttribute } from "../util/ngwAttributes";

import type { ResourceItem } from "@nextgisweb/resource/type";
import type {
    FeatureLayerField,
    FeatureItemExtensions,
} from "@nextgisweb/feature-layer/type";
import type { FeatureEditorStoreOptions } from "./type";
import type { FeatureItem, EditorStore } from "../type";

/** This attributes for loading to NGW */
type NgwAttributes = Record<string, unknown>;
/** This attributes for using in web */
type AppAttributes = Record<string, unknown>;

const saveSuccessMsg = i18n.gettext("Feature saved");

export class FeatureEditorStore {
    resourceId: number;
    featureId: number;

    saving = false;

    initLoading = false;

    private _attributes: AppAttributes = {};
    private _featureItem: FeatureItem = null;
    private _resourceItem: ResourceItem = null;

    _abortController = new AbortControllerHelper();
    private _extensionStores: Record<string, EditorStore> = {};

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

    /** Feature field values formatted for web */
    get values() {
        const values: AppAttributes = {};
        for (const field of this.fields) {
            const { keyname, datatype } = field;
            const val = this._attributes[keyname];
            values[keyname] = parseNgwAttribute(datatype, val);
        }
        return values;
    }

    /** Feature field values formatted in NGW way */
    get attributes() {
        return this._attributes;
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
        const extensionsToSave: Record<string, unknown> = {};
        for (const key in this._extensionStores) {
            const storeExtension = this._extensionStores[key];
            extensionsToSave[key] = toJS(storeExtension.value);
        }

        runInAction(() => {
            this.saving = true;
        });
        try {
            await this.route.put({
                query: { dt_format: "iso" },
                json: {
                    fields: toJS(this.attributes),
                    extensions: extensionsToSave,
                },
            });
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

    setValues = (values: AppAttributes = {}) => {
        runInAction(() => {
            this._attributes = this._formatAttributes(values);
        });
    };

    addExtensionStore = (key: string, extensionStore: EditorStore) => {
        this._extensionStores[key] = extensionStore;
        this._setExtensionValues(this._featureItem.extensions, {
            include: [key],
        });
    };

    reset = () => {
        if (this._featureItem) {
            this._setFeatureItem(this._featureItem);
        }
    };

    private _formatAttributes(values: NgwAttributes) {
        const attributes = { ...this._attributes };
        for (const key in values) {
            const val = values[key];
            const field = this.fields.find((f) => f.keyname === key);
            if (field) {
                attributes[key] = formatNgwAttribute(field.datatype, val);
            }
        }
        return attributes;
    }

    private _setExtensionValues(
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
            this._attributes = featureItem.fields;
        });
        this._setExtensionValues(featureItem.extensions);
    }

    private _abort(): void {
        this._abortController.abort();
    }
}
