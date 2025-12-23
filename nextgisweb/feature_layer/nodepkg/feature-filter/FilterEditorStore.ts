import dayjs from "dayjs";
import { action, observable } from "mobx";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";

import { getDefaultValue } from "./component/FilterCondition";
import { OPERATORS, ValidOperators } from "./type";
import type {
    CmpOp,
    ConditionExpr,
    ConditionValue,
    EqNeOp,
    FilterCondition,
    FilterExpression,
    FilterGroup,
    FilterGroupChild,
    FilterState,
    GroupExpr,
    HasOp,
    InOp,
} from "./type";

type TemporalDatatype = Extract<
    FeatureLayerFieldRead["datatype"],
    "DATE" | "TIME" | "DATETIME"
>;

const TEMPORAL_FORMATS: Record<TemporalDatatype, string> = {
    DATE: "YYYY-MM-DD",
    TIME: "HH:mm:ss",
    DATETIME: "YYYY-MM-DDTHH:mm:ss",
};

const TEMPORAL_TYPES = Object.keys(TEMPORAL_FORMATS) as TemporalDatatype[];

const isTemporalDatatype = (
    datatype: FeatureLayerFieldRead["datatype"]
): datatype is TemporalDatatype =>
    TEMPORAL_TYPES.includes(datatype as TemporalDatatype);

export interface FilterEditorStoreOptions {
    fields: FeatureLayerFieldRead[];
    value?: string;
}

export interface MoveFilterItem {
    id: number;
    parentGroupId: number;
}

export interface MoveTargetFilterItem {
    id?: number;
    parentGroupId: number;
}

const EMPTY_FILTER_STATE: FilterState = {
    rootGroup: {
        id: 0,
        operator: "all",
        conditions: [],
        groups: [],
        childrenOrder: [],
    },
};

export class FilterEditorStore {
    @observable.shallow accessor fields: FeatureLayerFieldRead[] = [];
    @observable.deep accessor filterState: FilterState = EMPTY_FILTER_STATE;
    @observable accessor activeTab: string = "constructor";
    @observable accessor jsonValue: string | undefined = undefined;
    @observable accessor isValid: boolean = true;
    @observable accessor validationError: string | undefined = undefined;
    @observable accessor validJsonValue: string | undefined = undefined;
    @observable accessor scrollToItemId: number | null = null;

    private transientIdCounter = 0;

    constructor(options: FilterEditorStoreOptions) {
        this.fields = options.fields;
        if (options.value) {
            this.loadFilter(options.value);
        } else {
            this.filterState.rootGroup.id = this.generateTransientId();
            this.validateCurrentState();
        }
    }

    @action.bound
    setActiveTab(tab: string) {
        if (tab === this.activeTab) {
            return;
        }

        if (tab === "json") {
            try {
                const expression = this.convertToFilterExpression(
                    this.filterState.rootGroup
                );
                this.jsonValue = JSON.stringify(expression, null, 2);
                this.isValid = true;
            } catch (error) {
                console.error(
                    gettext("Failed to generate JSON from filter state:"),
                    error
                );
                this.isValid = false;
            }
        }

        if (tab === "constructor") {
            if (this.jsonValue) {
                try {
                    const parsedJson = JSON.parse(this.jsonValue);
                    this.validateFilterExpression(parsedJson);
                    const newFilterState =
                        this.parseFilterExpression(parsedJson);
                    this.filterState = { rootGroup: newFilterState };
                    this.isValid = true;
                } catch (error) {
                    console.error(
                        gettext(
                            "Failed to parse JSON, falling back to JSON tab."
                        ),
                        error
                    );
                    this.isValid = false;
                    return;
                }
            } else {
                this.filterState = {
                    rootGroup: this.parseFilterExpression([]),
                };
                this.isValid = true;
            }
        }

        this.activeTab = tab;
    }

    @action.bound
    setJsonValue(value: string | undefined) {
        this.jsonValue = value;
        this.validateCurrentState();
    }

    @action.bound
    clear() {
        this.jsonValue = JSON.stringify([]);
        this.filterState = EMPTY_FILTER_STATE;
        this.validateCurrentState();
    }

    @action.bound
    addCondition(groupId: number) {
        const [firstField] = this.fields;
        const operator = "==" as EqNeOp;
        let value: ConditionValue = null;
        if (firstField) {
            value = getDefaultValue(this.fields, firstField.keyname, operator);
        }

        const newCondition: FilterCondition = {
            id: this.generateTransientId(),
            field: firstField?.keyname || "",
            operator,
            value,
        };
        const group = this._findGroupById(this.filterState.rootGroup, groupId);
        if (group) {
            group.conditions.push(newCondition as FilterCondition);
            group.childrenOrder.push({
                type: "condition",
                id: newCondition.id,
            });
            this.validateCurrentState();
            this.setScrollToItemId(newCondition.id);
        }
    }

    @action.bound
    addGroup(parentGroupId: number, operator: "all" | "any" = "all") {
        const newGroup: FilterGroup = {
            id: this.generateTransientId(),
            operator,
            conditions: [],
            groups: [],
            childrenOrder: [],
        };
        const parentGroup = this._findGroupById(
            this.filterState.rootGroup,
            parentGroupId
        );
        if (parentGroup) {
            parentGroup.groups.push(newGroup);
            parentGroup.childrenOrder.push({
                type: "group",
                id: newGroup.id,
            });
            this.validateCurrentState();
            this.setScrollToItemId(newGroup.id);
        }
    }

    @action.bound
    updateCondition(conditionId: number, updates: Partial<FilterCondition>) {
        this._updateConditionInTree(
            this.filterState.rootGroup,
            conditionId,
            updates
        );
        this.validateCurrentState();
    }

    @action.bound
    updateGroupOperator(groupId: number, operator: "all" | "any") {
        const group = this._findGroupById(this.filterState.rootGroup, groupId);
        if (group) {
            group.operator = operator;
            this.validateCurrentState();
        }
    }

    @action.bound
    deleteCondition(conditionId: number) {
        this._findAndRemoveCondition(this.filterState.rootGroup, conditionId);
        this.validateCurrentState();
    }

    @action.bound
    deleteGroup(groupId: number) {
        if (groupId === this.filterState.rootGroup.id) {
            console.warn(gettext("Cannot delete the root group."));
            return;
        }
        this._findAndRemoveGroup(this.filterState.rootGroup, groupId);
        this.validateCurrentState();
    }

    @action.bound
    moveConditionToGroup(
        conditionId: number,
        targetGroupId: number,
        overItemId: number | null
    ) {
        const conditionToMove = this._findAndRemoveCondition(
            this.filterState.rootGroup,
            conditionId
        );
        if (!conditionToMove) return;

        const targetGroup = this._findGroupById(
            this.filterState.rootGroup,
            targetGroupId
        );
        if (!targetGroup) return;

        this._insertChild(
            targetGroup,
            { type: "condition", id: conditionToMove.id },
            (group) => group.conditions,
            conditionToMove,
            overItemId
        );
        this.validateCurrentState();
    }

    @action.bound
    moveGroupToGroup(
        groupId: number,
        targetGroupId: number,
        overItemId: number | null
    ) {
        if (groupId === targetGroupId) return;

        const groupToMove = this._findAndRemoveGroup(
            this.filterState.rootGroup,
            groupId
        );
        if (!groupToMove) return;

        const targetGroup = this._findGroupById(
            this.filterState.rootGroup,
            targetGroupId
        );
        if (!targetGroup) return;

        this._insertChild(
            targetGroup,
            { type: "group", id: groupToMove.id },
            (group) => group.groups,
            groupToMove,
            overItemId
        );
        this.validateCurrentState();
    }

    @action.bound
    moveFilterItem(
        sourceItem: MoveFilterItem,
        target: MoveTargetFilterItem,
        filterType: "group" | "condition",
        position: "before" | "after"
    ) {
        if (sourceItem.id === target.id) return;

        const pendingItem = this._removeItemFromGroup(
            sourceItem.parentGroupId,
            sourceItem.id,
            filterType
        );
        if (!pendingItem) return;

        this._movePendingItemToGroupByPosition(
            target.parentGroupId,
            pendingItem,
            target.id,
            position
        );
    }

    @action.bound
    loadFilter(value: string) {
        try {
            this.transientIdCounter = 0;
            const expression = JSON.parse(value);
            this.validateFilterExpression(expression);
            const filterState = this.parseFilterExpression(expression);
            this.validJsonValue = JSON.stringify(expression);
            this.filterState = { rootGroup: filterState };
            this.isValid = true;
        } catch (error) {
            console.error(gettext("Failed to parse filter expression:"), error);
            this.activeTab = "json";
            this.isValid = false;
            this.validationError =
                error instanceof Error
                    ? error.message
                    : gettext("Invalid filter value");
        }
        this.jsonValue = value;
    }

    toFilterExpression(): FilterExpression {
        if (this.activeTab === "json" && this.jsonValue) {
            try {
                const parsed = JSON.parse(this.jsonValue);
                this.validateFilterExpression(parsed);
                this.isValid = true;
                return parsed;
            } catch (_error) {
                this.isValid = false;
                throw new Error(gettext("Invalid JSON or filter structure"), {
                    cause: _error,
                });
            }
        }
        const expression = this.convertToFilterExpression(
            this.filterState.rootGroup
        );
        this.validateFilterExpression(expression);
        return expression;
    }

    toJsonString(): string | undefined {
        if (this.activeTab === "json" && this.jsonValue) {
            try {
                const parsed = JSON.parse(this.jsonValue);
                if (Array.isArray(parsed) && parsed.length === 0) {
                    return undefined;
                }
                this.validateFilterExpression(parsed);
                this.isValid = true;
                return this.jsonValue;
            } catch (_error) {
                this.isValid = false;
                throw new Error(gettext("Invalid JSON or filter structure"), {
                    cause: _error,
                });
            }
        }
        const expression: FilterExpression = this.convertToFilterExpression(
            this.filterState.rootGroup
        );
        if (expression.length === 0) {
            return undefined;
        }
        this.validateFilterExpression(expression);
        return JSON.stringify(expression);
    }

    @action.bound
    setScrollToItemId(id: number | null) {
        this.scrollToItemId = id;
    }

    getValidJsonValue(): string | undefined {
        return this.validJsonValue;
    }

    private generateTransientId(): number {
        return ++this.transientIdCounter;
    }

    @action.bound
    private _removeItemFromGroup(
        groupId: number,
        itemId: number,
        filterType: "group" | "condition"
    ): FilterCondition | FilterGroup | undefined {
        const group = this._findGroupById(this.filterState.rootGroup, groupId);
        if (!group) return undefined;

        let index = -1;
        let item;
        if (filterType === "condition") {
            index = group.conditions.findIndex((c) => c.id === itemId);
            if (index === -1) return undefined;
            [item] = group.conditions.splice(index, 1);
            group.childrenOrder = group.childrenOrder.filter(
                (child) => !(child.type === "condition" && child.id === itemId)
            );
        } else {
            index = group.groups.findIndex((c) => c.id === itemId);
            if (index === -1) return undefined;
            [item] = group.groups.splice(index, 1);
            group.childrenOrder = group.childrenOrder.filter(
                (child) => !(child.type === "group" && child.id === itemId)
            );
        }
        return item;
    }

    @action.bound
    private _movePendingItemToGroupByPosition(
        targetGroupId: number,
        pendingItem: FilterCondition | FilterGroup,
        targetItemId?: number,
        position: "before" | "after" = "after"
    ) {
        const filterType = "conditions" in pendingItem ? "group" : "condition";
        const group = this._findGroupById(
            this.filterState.rootGroup,
            targetGroupId
        );
        if (!group) return;

        group.childrenOrder = group.childrenOrder.filter(
            (child) =>
                !(child.type === filterType && child.id === pendingItem.id)
        );

        const anchorIndex =
            targetItemId === undefined
                ? -1
                : group.childrenOrder.findIndex(
                      (child) => child.id === targetItemId
                  );
        const insertIndex =
            anchorIndex === -1
                ? group.childrenOrder.length
                : anchorIndex + (position === "after" ? 1 : 0);

        group.childrenOrder.splice(insertIndex, 0, {
            type: filterType,
            id: pendingItem.id,
        });

        const items =
            filterType === "condition" ? group.conditions : group.groups;
        const existingIdx = items.findIndex((c) => c.id === pendingItem.id);
        if (existingIdx === -1 && pendingItem) {
            if (filterType === "condition") {
                group.conditions.push(pendingItem as FilterCondition);
            } else {
                group.groups.push(pendingItem as FilterGroup);
            }
        }
        this.validateCurrentState();
    }

    private _findGroupById(
        group: FilterGroup,
        groupId: number
    ): FilterGroup | null {
        if (group.id === groupId) return group;
        for (const childGroup of group.groups) {
            const found = this._findGroupById(childGroup, groupId);
            if (found) return found;
        }
        return null;
    }

    private _findAndRemoveCondition(
        group: FilterGroup,
        conditionId: number
    ): FilterCondition | null {
        const index = group.conditions.findIndex((c) => c.id === conditionId);
        if (index !== -1) {
            const [removed] = group.conditions.splice(index, 1);
            group.childrenOrder = group.childrenOrder.filter(
                (child) =>
                    !(child.type === "condition" && child.id === removed.id)
            );
            return removed;
        }
        for (const childGroup of group.groups) {
            const found = this._findAndRemoveCondition(childGroup, conditionId);
            if (found) return found;
        }
        return null;
    }

    private _findAndRemoveGroup(
        group: FilterGroup,
        groupId: number
    ): FilterGroup | null {
        const index = group.groups.findIndex((g) => g.id === groupId);
        if (index !== -1) {
            const [removed] = group.groups.splice(index, 1);
            group.childrenOrder = group.childrenOrder.filter(
                (child) => !(child.type === "group" && child.id === removed.id)
            );
            return removed;
        }
        for (const childGroup of group.groups) {
            const found = this._findAndRemoveGroup(childGroup, groupId);
            if (found) return found;
        }
        return null;
    }

    private _updateConditionInTree(
        group: FilterGroup,
        conditionId: number,
        updates: Partial<FilterCondition>
    ): boolean {
        const condition = group.conditions.find((c) => c.id === conditionId);
        if (condition) {
            Object.assign(condition, updates);
            return true;
        }
        for (const childGroup of group.groups) {
            if (this._updateConditionInTree(childGroup, conditionId, updates)) {
                return true;
            }
        }
        return false;
    }

    private parseFilterExpression(expression: any[]): FilterGroup {
        if (!Array.isArray(expression) || expression.length === 0) {
            return {
                id: this.generateTransientId(),
                operator: "all",
                conditions: [],
                groups: [],
                childrenOrder: [],
            };
        }

        const [operator, ...args] = expression;

        if (operator === "all" || operator === "any") {
            const group: FilterGroup = {
                id: this.generateTransientId(),
                operator,
                conditions: [],
                groups: [],
                childrenOrder: [],
            };
            for (const arg of args) {
                if (Array.isArray(arg) && arg.length > 0) {
                    if (this.isConditionExpression(arg)) {
                        const condition = this.parseConditionExpression(arg);
                        group.conditions.push(condition);
                        group.childrenOrder.push({
                            type: "condition",
                            id: condition.id,
                        });
                    } else {
                        const childGroup = this.parseFilterExpression(arg);
                        group.groups.push(childGroup);
                        group.childrenOrder.push({
                            type: "group",
                            id: childGroup.id,
                        });
                    }
                }
            }
            return group;
        }

        if (this.isConditionExpression(expression)) {
            const condition = this.parseConditionExpression(expression);
            return {
                id: this.generateTransientId(),
                operator: "all",
                conditions: [condition],
                groups: [],
                childrenOrder: [{ type: "condition", id: condition.id }],
            };
        }

        return {
            id: this.generateTransientId(),
            operator: "all",
            conditions: [],
            groups: [],
            childrenOrder: [],
        };
    }

    private isConditionExpression(expression: any[]): boolean {
        if (!Array.isArray(expression) || expression.length < 2) return false;
        return ValidOperators.includes(expression[0]);
    }

    private parseConditionExpression(expression: any[]): FilterCondition {
        const [operator, fieldExpression, value] = expression;
        let field = "";
        if (Array.isArray(fieldExpression) && fieldExpression[0] === "get") {
            field = fieldExpression[1];
        } else if (operator === "has" || operator === "!has") {
            if (Array.isArray(expression[1]) && expression[1][0] === "get") {
                field = expression[1][1];
            }
        }

        const baseCondition = {
            id: this.generateTransientId(),
            field,
            operator,
            value,
        };

        if (operator === "has" || operator === "!has") {
            return {
                ...baseCondition,
                operator: operator as HasOp,
                value: undefined,
            };
        } else if (operator === "in" || operator === "!in") {
            return {
                ...baseCondition,
                operator: operator as InOp,
                value: Array.isArray(value) ? value : [],
            };
        } else if (operator === "==" || operator === "!=") {
            return {
                ...baseCondition,
                operator: operator as EqNeOp,
                value: value as ConditionValue,
            };
        } else {
            return {
                ...baseCondition,
                operator: operator as CmpOp,
                value: value as ConditionValue,
            };
        }
    }

    private convertToFilterExpression(group: FilterGroup): FilterExpression {
        const expressions: (ConditionExpr | GroupExpr)[] = [];

        const appendCondition = (condition: FilterCondition) => {
            if (condition.field) {
                if (
                    condition.operator === "has" ||
                    condition.operator === "!has"
                ) {
                    expressions.push([
                        condition.operator,
                        ["get", condition.field],
                    ]);
                } else {
                    if (
                        condition.operator === "in" ||
                        condition.operator === "!in"
                    ) {
                        expressions.push([
                            condition.operator as InOp,
                            ["get", condition.field],
                            condition.value as Array<string | number>,
                        ]);
                    } else if (
                        condition.operator === "==" ||
                        condition.operator === "!="
                    ) {
                        expressions.push([
                            condition.operator as EqNeOp,
                            ["get", condition.field],
                            condition.value as ConditionValue,
                        ]);
                    } else {
                        expressions.push([
                            condition.operator as CmpOp,
                            ["get", condition.field],
                            condition.value as string | number,
                        ]);
                    }
                }
            }
        };

        const appendGroup = (childGroup: FilterGroup) => {
            const childExpression = this.convertToFilterExpression(childGroup);
            if (childExpression.length > 1) {
                expressions.push(childExpression as GroupExpr);
            }
        };

        for (const child of group.childrenOrder) {
            if (child.type === "condition") {
                const condition = group.conditions.find(
                    (c) => c.id === child.id
                );
                if (condition) {
                    appendCondition(condition);
                }
            } else {
                const childGroup = group.groups.find((g) => g.id === child.id);
                if (childGroup) {
                    appendGroup(childGroup);
                }
            }
        }

        if (expressions.length === 0) return [];

        return [group.operator, ...expressions];
    }

    @action.bound
    private validateCurrentState() {
        try {
            let expression: FilterExpression;
            if (this.activeTab === "json" && this.jsonValue) {
                const parsed = JSON.parse(this.jsonValue);
                this.validateFilterExpression(parsed);
                expression = parsed;
            } else {
                expression = this.convertToFilterExpression(
                    this.filterState.rootGroup
                );
                this.validateFilterExpression(expression);
            }
            this.validJsonValue =
                expression.length === 0
                    ? undefined
                    : JSON.stringify(expression);
            this.isValid = true;
            this.validationError = undefined;
        } catch (error) {
            this.isValid = false;
            this.validationError =
                error instanceof Error
                    ? error.message
                    : gettext("Validation failed");
            this.validJsonValue = undefined;
        }
    }

    private validateFilterExpression(expression: any[]): void {
        if (!Array.isArray(expression)) {
            throw new Error(gettext("Expression must be an array"));
        }

        if (expression.length === 0) {
            return;
        }

        const [operator, ...args] = expression;

        if (operator === "all" || operator === "any") {
            if (args.length === 0) {
                throw new Error(
                    gettext("Group operator must have at least one argument")
                );
            }
            for (const arg of args) {
                if (!Array.isArray(arg)) {
                    throw new Error(
                        gettext(
                            "All arguments to group operator must be arrays"
                        )
                    );
                }
                this.validateFilterExpression(arg);
            }
            return;
        }

        if (this.isConditionExpression(expression)) {
            this.validateConditionExpression(expression);
            return;
        }

        throw new Error(
            gettextf("Unknown or invalid root operator: '{operator}'")({
                operator,
            })
        );
    }

    private validateDateTimeValue(
        fieldType: FeatureLayerFieldRead["datatype"],
        value: any,
        fieldName: string
    ): void {
        if (value === null || value === undefined) {
            return;
        }

        if (typeof value !== "string") {
            throw new Error(
                gettextf(
                    "Field '{fieldName}' expects a string for {fieldType}, but got '{valueType}'"
                )({ fieldName, fieldType, valueType: typeof value })
            );
        }

        if (!isTemporalDatatype(fieldType)) {
            return;
        }

        const format = TEMPORAL_FORMATS[fieldType];
        if (!format) {
            return;
        }

        const dayjsValue = dayjs(value, format, true);
        if (!dayjsValue.isValid()) {
            throw new Error(
                gettextf(
                    "Field '{fieldName}' expects {fieldType} format '{expectedFormat}', but got '{value}'"
                )({
                    fieldName,
                    fieldType,
                    expectedFormat: format,
                    value,
                })
            );
        }
    }

    private validateConditionExpression(expression: any[]): void {
        const [operator, fieldExpression, value] = expression;

        if (!ValidOperators.includes(operator)) {
            throw new Error(
                gettextf("Invalid operator: '{operator}'")({ operator })
            );
        }

        if (operator === "has" || operator === "!has") {
            if (expression.length !== 2) {
                throw new Error(
                    gettextf(
                        "Operator '{operator}' expects 1 argument, but got '{length}'"
                    )({ operator, length: expression.length - 1 })
                );
            }
        } else {
            if (expression.length !== 3) {
                throw new Error(
                    gettextf(
                        "Operator '{operator}' expects 1 argument, but got '{length}'"
                    )({ operator, length: expression.length - 1 })
                );
            }
        }

        if (!Array.isArray(fieldExpression) || fieldExpression[0] !== "get") {
            throw new Error(
                gettext("Field expression must be ['get', fieldName]")
            );
        }

        if (typeof fieldExpression[1] !== "string") {
            throw new Error(gettext("Field name must be a string"));
        }

        const fieldName = fieldExpression[1];
        const field = this.fields.find((f) => f.keyname === fieldName);
        if (!field) {
            throw new Error(
                gettextf("Unknown field: '{fieldName}'")({ fieldName })
            );
        }

        const operatorOption = OPERATORS.find((op) => op.value === operator);
        if (
            operatorOption &&
            !operatorOption.supportedTypes.includes(field.datatype)
        ) {
            const fieldType = field.datatype;
            throw new Error(
                gettextf(
                    "Operator '{operator}' is not supported for field type '{fieldType}'"
                )({ operator, fieldType })
            );
        }

        if (operator === "in" || operator === "!in") {
            if (!Array.isArray(value)) {
                throw new Error(
                    gettextf(
                        "Value for operator '{operator}' must be an array."
                    )({ operator })
                );
            }
            if (isTemporalDatatype(field.datatype)) {
                for (const item of value) {
                    this.validateDateTimeValue(field.datatype, item, fieldName);
                }
            }
        } else if (operator !== "has" && operator !== "!has") {
            const fieldType = field.datatype;
            const isTemporalField = isTemporalDatatype(fieldType);

            if (value !== null && value !== undefined) {
                if (isTemporalField) {
                    this.validateDateTimeValue(fieldType, value, fieldName);
                } else {
                    const valueType = typeof value;
                    if (
                        (fieldType === "INTEGER" || fieldType === "REAL") &&
                        valueType !== "number"
                    ) {
                        throw new Error(
                            gettextf(
                                "Field '{fieldName}' expects a number, but got '{valueType}'"
                            )({ fieldName, valueType })
                        );
                    }
                    if (fieldType === "BIGINT" && valueType !== "string") {
                        throw new Error(
                            gettextf(
                                "Field '{fieldName}' expects a string, but got '{valueType}'"
                            )({ fieldName, valueType })
                        );
                    }
                }
            }
        }
    }

    private _insertChild<T extends FilterCondition | FilterGroup>(
        targetGroup: FilterGroup,
        descriptor: FilterGroupChild,
        collectionSelector: (group: FilterGroup) => T[],
        item: T,
        overItemId: number | null
    ) {
        const collection = collectionSelector(targetGroup);
        const itemsById = new Map<number, T>();
        for (const existing of collection) {
            itemsById.set(existing.id, existing);
        }
        itemsById.set(item.id, item);

        const existingOrderIndex = targetGroup.childrenOrder.findIndex(
            (child) =>
                child.type === descriptor.type && child.id === descriptor.id
        );
        if (existingOrderIndex !== -1) {
            targetGroup.childrenOrder.splice(existingOrderIndex, 1);
        }

        const insertAt = this._findInsertionIndex(targetGroup, overItemId);

        if (insertAt === -1) {
            targetGroup.childrenOrder.push(descriptor);
        } else {
            targetGroup.childrenOrder.splice(insertAt, 0, descriptor);
        }

        const orderedIds = targetGroup.childrenOrder
            .filter((child) => child.type === descriptor.type)
            .map((child) => child.id);
        const orderedItems = orderedIds
            .map((id) => itemsById.get(id))
            .filter((value): value is T => Boolean(value));

        collection.splice(0, collection.length, ...orderedItems);
    }

    private _findInsertionIndex(
        group: FilterGroup,
        overItemId: number | null
    ): number {
        if (overItemId === null) {
            return -1;
        }

        const overIndex = group.childrenOrder.findIndex(
            (child) => child.id === overItemId
        );
        if (overIndex === -1) {
            return group.childrenOrder.length;
        }
        return Math.min(overIndex + 1, group.childrenOrder.length);
    }
}
