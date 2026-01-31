import { action, observable } from "mobx";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { getDefaultValue } from "./component/FilterCondition";
import type {
    ActiveTab,
    ConditionExpr,
    ConditionValue,
    FilterCondition,
    FilterExpression,
    FilterExpressionString,
    FilterGroup,
    FilterGroupChild,
    FilterState,
    GroupExpr,
    LogicalOp,
} from "./type";
import { parseFilterExpression } from "./util/parser";
import { validateFilterExpression } from "./util/validator";

function stringifyExpresion(
    value: FilterExpression,
    replacer?: (string | number)[] | null | undefined,
    space?: string | number | undefined
): FilterExpressionString {
    return JSON.stringify(value, replacer, space) as FilterExpressionString;
}

export interface FilterEditorStoreOptions {
    fields: FeatureLayerFieldRead[];
    value?: FilterExpressionString;
}

export interface MoveFilterItem {
    id: number;
    parentGroupId: number;
}

export interface MoveTargetFilterItem {
    id?: number;
    parentGroupId: number;
}

const generateEMptyFilterState = (): FilterState => ({
    rootGroup: {
        id: 0,
        type: "group",
        operator: "all",
        conditions: [],
        groups: [],
        childrenOrder: [],
    },
});

export class FilterEditorStore {
    @observable.shallow accessor fields: FeatureLayerFieldRead[] = [];
    @observable.deep accessor filterState: FilterState =
        generateEMptyFilterState();
    @observable accessor activeTab: ActiveTab = "constructor";
    @observable accessor jsonValue: FilterExpressionString | undefined =
        undefined;
    @observable accessor isValid: boolean = true;
    @observable accessor validationError: string | undefined = undefined;
    @observable accessor validJsonValue: FilterExpressionString | undefined =
        undefined;
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
    setActiveTab(tab: ActiveTab) {
        if (tab === this.activeTab) {
            return;
        }

        if (tab === "json") {
            try {
                const expression = this.convertToFilterExpression(
                    this.filterState.rootGroup
                );
                this.jsonValue = stringifyExpresion(expression, null, 2);
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
                    if (validateFilterExpression(parsedJson, this.fields)) {
                        const newFilterState = parseFilterExpression(
                            parsedJson,
                            this.generateTransientId
                        );
                        this.filterState = { rootGroup: newFilterState };
                        this.isValid = true;
                    }
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
                    rootGroup: parseFilterExpression(
                        [],
                        this.generateTransientId
                    ),
                };
                this.isValid = true;
            }
        }

        this.activeTab = tab;
    }

    @action.bound
    setJsonValue(value: FilterExpressionString | undefined) {
        this.jsonValue = value;
        this.validateCurrentState();
    }

    @action.bound
    clear() {
        this.jsonValue = stringifyExpresion([]);
        this.filterState = generateEMptyFilterState();
        this.validateCurrentState();
    }

    @action.bound
    addCondition(groupId: number) {
        const [firstField] = this.fields;
        const operator = "==";
        let value: ConditionValue = null;
        if (firstField) {
            value = getDefaultValue(this.fields, firstField.keyname, operator);
        }

        const newCondition: FilterCondition = {
            id: this.generateTransientId(),
            type: "condition",
            field: firstField?.keyname || "",
            operator,
            value,
        };
        const group = this._findGroupById(this.filterState.rootGroup, groupId);
        if (group) {
            group.conditions.push(newCondition);
            group.childrenOrder.push({
                type: "condition",
                id: newCondition.id,
            });
            this.validateCurrentState();
            this.setScrollToItemId(newCondition.id);
        }
    }

    @action.bound
    addGroup(parentGroupId: number, operator: LogicalOp = "all") {
        const newGroup: FilterGroup = {
            id: this.generateTransientId(),
            type: "group",
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
    updateGroupOperator(groupId: number, operator: LogicalOp) {
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
    loadFilter(value: FilterExpressionString) {
        try {
            this.transientIdCounter = 0;
            const expression = JSON.parse(value);
            if (validateFilterExpression(expression, this.fields)) {
                const filterState = parseFilterExpression(
                    expression,
                    this.generateTransientId
                );
                this.validJsonValue = stringifyExpresion(expression);
                this.filterState = { rootGroup: filterState };
                this.isValid = true;
            }
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
                validateFilterExpression(parsed, this.fields);
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
        validateFilterExpression(expression, this.fields);
        return expression;
    }

    toJsonString(): FilterExpressionString | undefined {
        if (this.activeTab === "json" && this.jsonValue) {
            try {
                const parsed = JSON.parse(this.jsonValue);
                if (Array.isArray(parsed) && parsed.length === 0) {
                    return undefined;
                }
                validateFilterExpression(parsed, this.fields);
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
        validateFilterExpression(expression, this.fields);
        return stringifyExpresion(expression);
    }

    @action.bound
    setScrollToItemId(id: number | null) {
        this.scrollToItemId = id;
    }

    getValidJsonValue(): string | undefined {
        return this.validJsonValue;
    }

    private generateTransientId = (): number => {
        return ++this.transientIdCounter;
    };

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
        const filterType = pendingItem.type;
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

    private convertToFilterExpression(group: FilterGroup): FilterExpression {
        const expressions: (ConditionExpr | GroupExpr)[] = [];

        const appendCondition = (condition: FilterCondition) => {
            const { operator, field, value } = condition;
            if (field) {
                if (operator === "has" || operator === "!has") {
                    expressions.push([operator, ["get", field]]);
                } else if (value !== undefined && value !== null) {
                    if (operator === "in" || operator === "!in") {
                        if (Array.isArray(value)) {
                            expressions.push([operator, ["get", field], value]);
                        }
                    } else if (operator === "==" || operator === "!=") {
                        if (!Array.isArray(value)) {
                            expressions.push([operator, ["get", field], value]);
                        }
                    } else if (
                        typeof value === "string" ||
                        typeof value === "number"
                    ) {
                        expressions.push([operator, ["get", field], value]);
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
                validateFilterExpression(parsed, this.fields);
                expression = parsed;
            } else {
                expression = this.convertToFilterExpression(
                    this.filterState.rootGroup
                );
                validateFilterExpression(expression, this.fields);
            }
            this.validJsonValue =
                expression.length === 0
                    ? undefined
                    : stringifyExpresion(expression);
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
