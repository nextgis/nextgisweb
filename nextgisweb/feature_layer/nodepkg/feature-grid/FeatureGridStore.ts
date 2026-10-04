import { actionBound, computed, observableRef, observableShallow } from "mobx";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import type { ActionToolbarAction } from "@nextgisweb/gui/action-toolbar";
import type { SizeType } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import type { FilterExpressionString } from "../feature-filter/type";
import { pruneFilterExpressionByFields } from "../feature-filter/util/prune";

import { KEY_FIELD_ID } from "./constant";
import type { QueryParams } from "./hook/useFeatureTable";
import type { ActionProps, FeatureGridProps, SetValue } from "./type";

export class FeatureGridStore {
  @observableRef accessor id: number;
  @observableRef accessor versioning: boolean = false;
  @observableRef accessor size: SizeType = "middle";
  @observableRef accessor actions: ActionToolbarAction<ActionProps>[] = [];
  @observableRef accessor version: number = 0;
  @observableRef accessor readonly: boolean = true;
  @observableRef accessor canCreate: boolean = true;
  @observableRef accessor editOnNewPage: boolean = false;
  @observableRef accessor cleanSelectedOnFilter: boolean = true;
  @observableRef accessor settingsOpen: boolean = false;
  @observableRef accessor showGridAggregation: boolean = false;

  @observableShallow accessor selectedIds: number[] = [];
  @observableShallow accessor _queryParams: QueryParams | null = null;
  @observableShallow accessor visibleFields: number[] = [KEY_FIELD_ID];
  @observableShallow accessor fields: FeatureLayerFieldRead[] = [];
  @observableRef accessor globalFilterExpression:
    | FilterExpressionString
    | undefined = undefined;
  @observableRef accessor filterExpression: FilterExpressionString | undefined =
    undefined;

  @observableRef accessor beforeDelete:
    | ((featureIds: number[]) => void)
    | null = null;
  @observableRef accessor deleteError: ((featureIds: number[]) => void) | null =
    null;
  @observableRef accessor onSelect: ((selected: number[]) => void) | null =
    null;
  @observableRef accessor onDelete: ((featureIds: number[]) => void) | null =
    null;
  @observableRef accessor onOpen:
    | ((opt: { featureId: number; resourceId: number }) => void)
    | null = null;
  @observableRef accessor onSave:
    | ((value: CompositeRead | undefined) => void)
    | null = null;

  constructor(props: FeatureGridProps) {
    this.id = props.id;
    this.size = props.size ?? this.size;
    this.actions = props.actions ?? this.actions;
    this.version = props.version ?? this.version;
    this.readonly = props.readonly ?? this.readonly;
    this.canCreate = props.canCreate ?? this.canCreate;
    this._queryParams = props.queryParams ?? this._queryParams;
    this.selectedIds = props.selectedIds ?? this.selectedIds;
    this.editOnNewPage = props.editOnNewPage ?? this.editOnNewPage;
    this.cleanSelectedOnFilter =
      props.cleanSelectedOnFilter ?? this.cleanSelectedOnFilter;
    this.globalFilterExpression =
      props.globalFilterExpression ?? this.globalFilterExpression;
    this.beforeDelete = props.beforeDelete ?? this.beforeDelete;
    this.deleteError = props.deleteError ?? this.deleteError;
    this.onSelect = props.onSelect ?? this.onSelect;
    this.onDelete = props.onDelete ?? this.onDelete;
    this.onSave = props.onSave ?? this.onSave;
    this.onOpen = props.onOpen ?? this.onOpen;
  }

  @computed
  get queryParams(): QueryParams | null {
    const params = { ...this._queryParams };

    let filter = this.filterExpression;
    if (this.globalFilterExpression) {
      filter = `[${[`"all"`, this.globalFilterExpression, this.filterExpression]
        .filter(Boolean)
        .join(",")}]` as FilterExpressionString;
    }

    if (filter) {
      params["filter"] = filter;
    }

    return Object.keys(params).length > 0 ? params : null;
  }

  @actionBound
  setId(id: number) {
    this.id = id;
  }

  @actionBound
  setVersioning(value: boolean) {
    this.versioning = value;
  }

  @actionBound
  setFields(fields: FeatureLayerFieldRead[]) {
    this.fields = fields;
    this.pruneFilterExpressionByFields();
  }

  @actionBound
  setVisibleFields(visibleFields: number[]) {
    this.visibleFields = visibleFields;
  }

  @actionBound
  setSize(size: SizeType | undefined) {
    this.size = size;
  }

  @actionBound
  setActions(actions: ActionToolbarAction<ActionProps>[]) {
    this.actions = actions;
  }

  @actionBound
  setVersion(version: number) {
    this.version = version;
  }

  @actionBound
  setSettingsOpen(settingsOpen: boolean) {
    this.settingsOpen = settingsOpen;
  }

  @actionBound
  setShowGridAggregation(showGridAggregation: boolean) {
    this.showGridAggregation = showGridAggregation;
  }

  @actionBound
  bumpVersion() {
    this.version = this.version + 1;
  }

  @actionBound
  setReadonly(readonly: boolean) {
    this.readonly = readonly;
  }

  @actionBound
  setQueryParams(queryParams: SetValue<QueryParams | null>) {
    this.setValue("_queryParams", queryParams);
  }

  @actionBound
  setSelectedIds(selectedIds: SetValue<number[]>) {
    this.setValue("selectedIds", selectedIds);
  }

  @actionBound
  setEditOnNewPage(editOnNewPage: boolean) {
    this.editOnNewPage = editOnNewPage;
  }

  @actionBound
  setCleanSelectedOnFilter(cleanSelectedOnFilter: boolean) {
    this.cleanSelectedOnFilter = cleanSelectedOnFilter;
  }

  @actionBound
  setBeforeDelete(beforeDelete: ((featureIds: number[]) => void) | null) {
    this.beforeDelete = beforeDelete;
  }

  @actionBound
  setDeleteError = (deleteError: ((featureIds: number[]) => void) | null) => {
    this.deleteError = deleteError;
  };

  @actionBound
  setOnSelect(onSelect: ((selected: number[]) => void) | null) {
    this.onSelect = onSelect;
  }

  @actionBound
  setOnDelete(onDelete: ((featureIds: number[]) => void) | null) {
    this.onDelete = onDelete;
  }

  @actionBound
  setOnSave(onSave: ((value: CompositeRead | undefined) => void) | null) {
    this.onSave = onSave;
  }

  @actionBound
  setGlobalFilterExpression(
    filterExpression: FilterExpressionString | undefined
  ) {
    this.globalFilterExpression = filterExpression;
  }

  @actionBound
  setFilterExpression(filterExpression: FilterExpressionString | undefined) {
    this.filterExpression = filterExpression;
  }

  @actionBound
  pruneFilterExpressionByFields() {
    const nextFilterExpression = pruneFilterExpressionByFields(
      this.filterExpression,
      this.fields
    );

    if (nextFilterExpression !== this.filterExpression) {
      this.filterExpression = nextFilterExpression;
    }
  }

  async loadFields({ signal }: { signal?: AbortSignal } = {}) {
    try {
      const res = await route("resource.item", { id: this.id }).get({
        cache: true,
        signal,
      });
      const fields = res.feature_layer?.fields;
      if (fields) {
        this.setFields(fields);
        this.setVisibleFields([
          KEY_FIELD_ID,
          ...fields.filter((f) => f.grid_visibility).map((f) => f.id),
        ]);
      }
    } catch {
      //
    }
  }

  @actionBound
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
