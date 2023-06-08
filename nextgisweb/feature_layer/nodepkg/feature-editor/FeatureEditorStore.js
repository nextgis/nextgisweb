import { makeAutoObservable, runInAction } from "mobx";

import { route } from "@nextgisweb/pyramid/api";
import { AbortControllerHelper } from "@nextgisweb/pyramid/util/abort";

import { parseNgwAttribute, formatNgwAttribute } from "../util/ngwAttributes";

export class FeatureEditorStore {
    constructor({ resourceId, featureId }) {
        if (resourceId === undefined) {
            throw new Error(
                "`resourceId` is required attribute for FeatureEditorStore"
            );
        }

        this.initLoading = false;

        this.resourceId = resourceId;
        this.featureId = featureId;

        this._attributes = {};
        this._extensions = {};
        this._featureItem = null;
        this._resourceItem = null;

        this._abortController = new AbortControllerHelper();
        makeAutoObservable(this, { _abortController: false, route: false });
    }

    get fields() {
        const fields =
            this._resourceItem &&
            this._resourceItem.feature_layer &&
            this._resourceItem.feature_layer.fields;
        return fields ?? [];
    }

    /** Feature field values formatted for web */
    get values() {
        const values = {};
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

    get extensions() {
        return this._extensions;
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

    save = async ({ extensions }) => {

        const extensionsToSave = { ...this.extensions };

        for (const key in extensions) {
            const storeExtension = extensions[key];
            if (storeExtension !== undefined && storeExtension !== null) {
                extensionsToSave[key] = storeExtension;
            }
        }

        await this.route.put({
            query: { dt_format: "iso" },
            json: {
                fields: this.attributes,
                extensions: extensionsToSave,
            },
        });
    };

    destroy = () => {
        this._abort();
    };

    setValues = (values = {}) => {
        runInAction(() => {
            this._attributes = this._formatAttributes(values);
        });
    };

    setExtension = (extension, value) => {
        const extensions = { ...this._extensions };
        extensions[extension] = value;
        this._extensions = extensions;
    };

    reset = () => {
        if (this._featureItem) {
            this._setFeatureItem(this._featureItem);
        }
    };

    _formatAttributes(values) {
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

    _setFeatureItem(featureItem) {
        runInAction(() => {
            this._featureItem = featureItem;
            this._attributes = featureItem.fields;
            this._extensions = featureItem.extensions;
        });
    }

    _abort() {
        this._abortController.abort();
    }
}
