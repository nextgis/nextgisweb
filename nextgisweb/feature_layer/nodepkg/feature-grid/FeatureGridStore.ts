import { action, observable } from "mobx";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import type { ActionToolbarAction } from "@nextgisweb/gui/action-toolbar";
import type { SizeType } from "@nextgisweb/gui/antd";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import { KEY_FIELD_ID } from "./constant";
import type { QueryParams } from "./hook/useFeatureTable";
import type { ActionProps, FeatureGridProps, SetValue } from "./type";

export class FeatureGridStore {
    @observable accessor id: number;
    @observable accessor versioning: boolean = false;
    @observable accessor size: SizeType = "middle";
    @observable accessor actions: ActionToolbarAction<ActionProps>[] = [];
    @observable accessor version: number = 0;
    @observable accessor readonly: boolean = true;
    @observable accessor editOnNewPage: boolean = false;
    @observable accessor cleanSelectedOnFilter: boolean = true;
    @observable accessor settingsOpen: boolean = false;

    @observable.shallow accessor selectedIds: number[] = [];
    @observable.shallow accessor queryParams: QueryParams | null = null;
    @observable.shallow accessor visibleFields: number[] = [KEY_FIELD_ID];
    @observable.shallow accessor fields: FeatureLayerFieldRead[] = [];

    @observable accessor beforeDelete: ((featureIds: number[]) => void) | null =
        null;
    @observable accessor deleteError: ((featureIds: number[]) => void) | null =
        null;
    @observable accessor onSelect: ((selected: number[]) => void) | null = null;
    @observable accessor onDelete: ((featureIds: number[]) => void) | null =
        null;
    @observable accessor onOpen:
        | ((opt: { featureId: number; resourceId: number }) => void)
        | null = null;
    @observable accessor onSave:
        | ((value: CompositeRead | undefined) => void)
        | null = null;

    constructor({ id, ...props }: FeatureGridProps) {
        this.id = id;

        for (const key in props) {
            const k = key as keyof FeatureGridProps;
            const prop = (props as FeatureGridProps)[k];
            if (prop !== undefined) {
                Object.assign(this, { [k]: prop });
            }
        }
    }

    @action
    setId = (id: number) => {
        this.id = id;
    };

    @action
    setVersioning = (value: boolean) => {
        this.versioning = value;
    };

    @action
    setFields = (fields: FeatureLayerFieldRead[]) => {
        this.fields = fields;
    };

    @action
    setVisibleFields = (visibleFields: number[]) => {
        this.visibleFields = visibleFields;
    };

    @action
    setSize = (size: SizeType | undefined) => {
        this.size = size;
    };

    @action
    setActions = (actions: ActionToolbarAction<ActionProps>[]) => {
        this.actions = actions;
    };

    @action
    setVersion = (version: number) => {
        this.version = version;
    };

    @action
    setSettingsOpen = (settingsOpen: boolean) => {
        this.settingsOpen = settingsOpen;
    };

    @action
    bumpVersion = () => {
        this.version = this.version + 1;
    };

    @action
    setReadonly = (readonly: boolean) => {
        this.readonly = readonly;
    };

    @action
    setQueryParams = (queryParams: SetValue<QueryParams | null>) => {
        this.setValue("queryParams", queryParams);
    };

    @action
    setSelectedIds = (selectedIds: SetValue<number[]>) => {
        this.setValue("selectedIds", selectedIds);
    };

    @action
    setEditOnNewPage = (editOnNewPage: boolean) => {
        this.editOnNewPage = editOnNewPage;
    };

    @action
    setCleanSelectedOnFilter = (cleanSelectedOnFilter: boolean) => {
        this.cleanSelectedOnFilter = cleanSelectedOnFilter;
    };

    @action
    setBeforeDelete = (
        beforeDelete: ((featureIds: number[]) => void) | null
    ) => {
        this.beforeDelete = beforeDelete;
    };

    @action
    setDeleteError = (deleteError: ((featureIds: number[]) => void) | null) => {
        this.deleteError = deleteError;
    };

    @action
    setOnSelect = (onSelect: ((selected: number[]) => void) | null) => {
        this.onSelect = onSelect;
    };

    @action
    setOnDelete = (onDelete: ((featureIds: number[]) => void) | null) => {
        this.onDelete = onDelete;
    };

    @action
    setOnSave = (
        onSave: ((value: CompositeRead | undefined) => void) | null
    ) => {
        this.onSave = onSave;
    };

    @action
    private setValue<T>(property: keyof this, valueOrUpdater: SetValue<T>) {
        const isUpdaterFunction = (
            input: unknown
        ): input is (prevValue: T) => T => {
            return typeof input === "function";
        };

        const newValue = isUpdaterFunction(valueOrUpdater)
            ? valueOrUpdater(this[property] as T)
            : valueOrUpdater;

        Object.assign(this, { [property]: newValue });
    }
}
