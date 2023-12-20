import { makeAutoObservable } from "mobx";

import type { ActionToolbarAction } from "@nextgisweb/gui/action-toolbar";
import type { SizeType } from "@nextgisweb/gui/antd";
import type { ResourceItem } from "@nextgisweb/resource/type/Resource";

import type { FeatureLayerField } from "../type";

import { KEY_FIELD_ID } from "./constant";
import type { QueryParams } from "./hook/useFeatureTable";
import type { ActionProps, FeatureGridProps, SetValue } from "./type";

export class FeatureGridStore {
    id: number;
    size: SizeType = "middle";
    actions: ActionToolbarAction<ActionProps>[] = [];
    version = 0;
    readonly = true;
    queryParams: QueryParams | null = null;
    selectedIds: number[] = [];
    editOnNewPage = false;
    cleanSelectedOnFilter? = true;
    settingsOpen = false;

    visibleFields: number[] = [KEY_FIELD_ID];
    fields: FeatureLayerField[] = [];

    beforeDelete?: (featureIds: number[]) => void;
    deleteError?: (featureIds: number[]) => void;
    onSelect?: (selected: number[]) => void;
    onDelete?: (featureIds: number[]) => void;
    onSave?: (value: ResourceItem | undefined) => void;

    constructor({ id, ...props }: FeatureGridProps) {
        this.id = id;
        for (const key in props) {
            const k = key as keyof FeatureGridProps;
            const prop = (props as FeatureGridProps)[k];
            if (prop !== undefined) {
                Object.assign(this, { [k]: prop });
            }
        }

        makeAutoObservable(this, {});
    }

    setId = (id: number) => {
        this.id = id;
    };

    setFields = (fields: FeatureLayerField[]) => {
        this.fields = fields;
    };

    setVisibleFields = (visibleFields: number[]) => {
        this.visibleFields = visibleFields;
    };

    setSize = (size: SizeType | undefined) => {
        this.size = size;
    };

    setActions = (actions: ActionToolbarAction<ActionProps>[]) => {
        this.actions = actions;
    };

    setVersion = (version: number) => {
        this.version = version;
    };

    setSettingsOpen = (settingsOpen: boolean) => {
        this.settingsOpen = settingsOpen;
    };

    bumpVersion = () => {
        this.version = this.version + 1;
    };

    setReadonly = (readonly: boolean) => {
        this.readonly = readonly;
    };

    setQueryParams = (queryParams: SetValue<QueryParams | null>) => {
        this.setValue("queryParams", queryParams);
    };

    setSelectedIds = (selectedIds: SetValue<number[]>) => {
        this.setValue("selectedIds", selectedIds);
    };

    setEditOnNewPage = (editOnNewPage: boolean) => {
        this.editOnNewPage = editOnNewPage;
    };

    setCleanSelectedOnFilter = (cleanSelectedOnFilter: boolean | undefined) => {
        this.cleanSelectedOnFilter = cleanSelectedOnFilter;
    };

    setBeforeDelete = (
        beforeDelete: ((featureIds: number[]) => void) | undefined
    ) => {
        this.beforeDelete = beforeDelete;
    };

    setDeleteError = (
        deleteError: ((featureIds: number[]) => void) | undefined
    ) => {
        this.deleteError = deleteError;
    };

    setOnSelect = (onSelect: ((selected: number[]) => void) | undefined) => {
        this.onSelect = onSelect;
    };

    setOnDelete = (onDelete: ((featureIds: number[]) => void) | undefined) => {
        this.onDelete = onDelete;
    };

    setOnSave = (
        onSave: ((value: ResourceItem | undefined) => void) | undefined
    ) => {
        this.onSave = onSave;
    };

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
