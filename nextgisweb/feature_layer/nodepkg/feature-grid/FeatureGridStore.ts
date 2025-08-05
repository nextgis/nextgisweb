import { action, observable } from "mobx";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import type { ActionToolbarAction } from "@nextgisweb/gui/action-toolbar";
import type { SizeType } from "@nextgisweb/gui/antd";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import { KEY_FIELD_ID } from "./constant";
import type { QueryParams } from "./hook/useFeatureTable";
import type { ActionProps, FeatureGridProps, SetValue } from "./type";

export class FeatureGridStore {
    @observable.ref accessor id: number;
    @observable.ref accessor versioning: boolean = false;
    @observable.ref accessor size: SizeType = "middle";
    @observable.ref accessor actions: ActionToolbarAction<ActionProps>[] = [];
    @observable.ref accessor version: number = 0;
    @observable.ref accessor readonly: boolean = true;
    @observable.ref accessor canCreate: boolean = true;
    @observable.ref accessor editOnNewPage: boolean = false;
    @observable.ref accessor cleanSelectedOnFilter: boolean = true;
    @observable.ref accessor settingsOpen: boolean = false;

    @observable.shallow accessor selectedIds: number[] = [];
    @observable.shallow accessor queryParams: QueryParams | null = null;
    @observable.shallow accessor visibleFields: number[] = [KEY_FIELD_ID];
    @observable.shallow accessor fields: FeatureLayerFieldRead[] = [];
    @observable.ref accessor filterExpression: string | undefined = undefined;

    @observable.ref accessor beforeDelete:
        | ((featureIds: number[]) => void)
        | null = null;
    @observable.ref accessor deleteError:
        | ((featureIds: number[]) => void)
        | null = null;
    @observable.ref accessor onSelect: ((selected: number[]) => void) | null =
        null;
    @observable.ref accessor onDelete: ((featureIds: number[]) => void) | null =
        null;
    @observable.ref accessor onOpen:
        | ((opt: { featureId: number; resourceId: number }) => void)
        | null = null;
    @observable.ref accessor onSave:
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

    @action.bound
    setId(id: number) {
        this.id = id;
    }

    @action.bound
    setVersioning(value: boolean) {
        this.versioning = value;
    }

    @action.bound
    setFields(fields: FeatureLayerFieldRead[]) {
        this.fields = fields;
    }

    @action.bound
    setVisibleFields(visibleFields: number[]) {
        this.visibleFields = visibleFields;
    }

    @action.bound
    setSize(size: SizeType | undefined) {
        this.size = size;
    }

    @action.bound
    setActions(actions: ActionToolbarAction<ActionProps>[]) {
        this.actions = actions;
    }

    @action.bound
    setVersion(version: number) {
        this.version = version;
    }

    @action.bound
    setSettingsOpen(settingsOpen: boolean) {
        this.settingsOpen = settingsOpen;
    }

    @action.bound
    bumpVersion() {
        this.version = this.version + 1;
    }

    @action.bound
    setReadonly(readonly: boolean) {
        this.readonly = readonly;
    }

    @action.bound
    setQueryParams(queryParams: SetValue<QueryParams | null>) {
        this.setValue("queryParams", queryParams);
    }

    @action.bound
    setSelectedIds(selectedIds: SetValue<number[]>) {
        this.setValue("selectedIds", selectedIds);
    }

    @action.bound
    setEditOnNewPage(editOnNewPage: boolean) {
        this.editOnNewPage = editOnNewPage;
    }

    @action.bound
    setCleanSelectedOnFilter(cleanSelectedOnFilter: boolean) {
        this.cleanSelectedOnFilter = cleanSelectedOnFilter;
    }

    @action.bound
    setBeforeDelete(beforeDelete: ((featureIds: number[]) => void) | null) {
        this.beforeDelete = beforeDelete;
    }

    @action.bound
    setDeleteError = (deleteError: ((featureIds: number[]) => void) | null) => {
        this.deleteError = deleteError;
    };

    @action.bound
    setOnSelect(onSelect: ((selected: number[]) => void) | null) {
        this.onSelect = onSelect;
    }

    @action.bound
    setOnDelete(onDelete: ((featureIds: number[]) => void) | null) {
        this.onDelete = onDelete;
    }

    @action.bound
    setOnSave(onSave: ((value: CompositeRead | undefined) => void) | null) {
        this.onSave = onSave;
    }

    @action.bound
    setFilterExpression(filterExpression: string | undefined) {
        this.filterExpression = filterExpression;
    }

    @action.bound
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
