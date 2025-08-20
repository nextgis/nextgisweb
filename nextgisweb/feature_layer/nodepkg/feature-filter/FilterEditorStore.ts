import { action, observable } from "mobx";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";

import { ValidOperators } from "./type";
import type { FilterCondition, FilterGroup, MapLibreExpression } from "./type";

export interface FilterEditorStoreOptions {
    fields: FeatureLayerFieldRead[];
    value?: any[];
}

export class FilterEditorStore {
    @observable.shallow accessor fields: FeatureLayerFieldRead[] = [];
    @observable.deep accessor filterState: FilterGroup = {
        id: 0,
        operator: "all",
        conditions: [],
        groups: [],
    };
    @observable accessor activeTab: string = "constructor";
    @observable accessor jsonValue: string | undefined = undefined;
    @observable accessor isValid: boolean = true;

    private transientIdCounter = 0;

    constructor(options: FilterEditorStoreOptions) {
        this.fields = options.fields;
        if (options.value && options.value.length > 0) {
            this.loadFilter(options.value);
        } else {
            this.filterState.id = this.generateTransientId();
        }
    }

    @action.bound
    setActiveTab(tab: string) {
        if (tab === this.activeTab) {
            return;
        }

        if (tab === "json") {
            try {
                const expression = this.convertToMapLibreExpression(
                    this.filterState
                );
                this.jsonValue = JSON.stringify(expression, null, 2);
                this.isValid = true;
            } catch (error) {
                console.error(
                    "Failed to generate JSON from filter state:",
                    error
                );
                this.isValid = false;
            }
        }

        if (tab === "constructor") {
            if (this.jsonValue) {
                try {
                    const parsedJson = JSON.parse(this.jsonValue);
                    const newFilterState =
                        this.parseMapLibreExpression(parsedJson);
                    this.filterState = newFilterState;
                    this.isValid = true;
                } catch (error) {
                    console.error(
                        "Failed to parse JSON, falling back to JSON tab.",
                        error
                    );
                    this.isValid = false;
                    return;
                }
            } else {
                this.filterState = this.parseMapLibreExpression([]);
                this.isValid = true;
            }
        }

        this.activeTab = tab;
    }

    @action.bound
    setJsonValue(value: string | undefined) {
        this.jsonValue = value;
    }

    @action.bound
    addCondition(groupId: number, conditionData?: Omit<FilterCondition, "id">) {
        const defaultCondition = conditionData || {
            field: this.fields[0]?.keyname || "",
            operator: "==",
            value: "",
        };

        const newCondition: FilterCondition = {
            ...defaultCondition,
            id: this.generateTransientId(),
        };
        const group = this._findGroupById(this.filterState, groupId);
        if (group) {
            group.conditions.push(newCondition);
        }
    }

    @action.bound
    addGroup(parentGroupId: number, operator: "all" | "any" = "all") {
        const newGroup: FilterGroup = {
            id: this.generateTransientId(),
            operator,
            conditions: [],
            groups: [],
        };
        const parentGroup = this._findGroupById(
            this.filterState,
            parentGroupId
        );
        if (parentGroup) {
            parentGroup.groups.push(newGroup);
        }
    }

    @action.bound
    updateCondition(conditionId: number, updates: Partial<FilterCondition>) {
        this._updateConditionInTree(this.filterState, conditionId, updates);
    }

    @action.bound
    updateGroupOperator(groupId: number, operator: "all" | "any") {
        const group = this._findGroupById(this.filterState, groupId);
        if (group) {
            group.operator = operator;
        }
    }

    @action.bound
    deleteCondition(conditionId: number) {
        this._findAndRemoveCondition(this.filterState, conditionId);
    }

    @action.bound
    deleteGroup(groupId: number) {
        if (groupId === this.filterState.id) {
            console.warn("Cannot delete the root group.");
            return;
        }
        this._findAndRemoveGroup(this.filterState, groupId);
    }

    @action.bound
    moveConditionToGroup(
        conditionId: number,
        sourceGroupId: number,
        targetGroupId: number,
        overItemId: number | null
    ) {
        const conditionToMove = this._findAndRemoveCondition(
            this.filterState,
            conditionId
        );
        if (!conditionToMove) return;

        const targetGroup = this._findGroupById(
            this.filterState,
            targetGroupId
        );
        if (!targetGroup) return;

        if (overItemId) {
            const targetIndex = targetGroup.conditions.findIndex(
                (c) => c.id === overItemId
            );
            if (targetIndex !== -1) {
                targetGroup.conditions.splice(targetIndex, 0, conditionToMove);
            } else {
                targetGroup.conditions.push(conditionToMove);
            }
        } else {
            targetGroup.conditions.push(conditionToMove);
        }
    }

    @action.bound
    moveGroupToGroup(
        groupId: number,
        sourceGroupId: number | null,
        targetGroupId: number,
        overItemId: number | null
    ) {
        if (groupId === targetGroupId) return;

        const groupToMove = this._findAndRemoveGroup(this.filterState, groupId);
        if (!groupToMove) return;

        const targetGroup = this._findGroupById(
            this.filterState,
            targetGroupId
        );
        if (!targetGroup) return;

        if (overItemId) {
            const targetIndex = targetGroup.groups.findIndex(
                (g) => g.id === overItemId
            );
            if (targetIndex !== -1) {
                targetGroup.groups.splice(targetIndex, 0, groupToMove);
            } else {
                targetGroup.groups.push(groupToMove);
            }
        } else {
            targetGroup.groups.push(groupToMove);
        }
    }

    @action.bound
    loadFilter(expression: any[]) {
        try {
            this.transientIdCounter = Date.now();
            const filterState = this.parseMapLibreExpression(expression);
            this.filterState = filterState;
            this.isValid = true;
        } catch (error) {
            console.error("Failed to parse filter expression:", error);
            this.activeTab = "json";
            this.isValid = false;
        }
        this.jsonValue = JSON.stringify(expression, null, 2);
    }

    toMapLibreExpression(): MapLibreExpression {
        if (this.activeTab === "json" && this.jsonValue) {
            try {
                const parsed = JSON.parse(this.jsonValue);
                this.isValid = true;
                return parsed;
            } catch (_error) {
                this.isValid = false;
                throw new Error("Invalid JSON", { cause: _error });
            }
        }
        return this.convertToMapLibreExpression(this.filterState);
    }

    private generateTransientId(): number {
        return ++this.transientIdCounter;
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
            return group.conditions.splice(index, 1)[0];
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
            return group.groups.splice(index, 1)[0];
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

    private parseMapLibreExpression(expression: any[]): FilterGroup {
        if (!Array.isArray(expression) || expression.length === 0) {
            return {
                id: this.generateTransientId(),
                operator: "all",
                conditions: [],
                groups: [],
            };
        }

        const [operator, ...args] = expression;

        if (operator === "all" || operator === "any") {
            const group: FilterGroup = {
                id: this.generateTransientId(),
                operator,
                conditions: [],
                groups: [],
            };
            for (const arg of args) {
                if (Array.isArray(arg) && arg.length > 0) {
                    if (this.isConditionExpression(arg)) {
                        group.conditions.push(
                            this.parseConditionExpression(arg)
                        );
                    } else {
                        group.groups.push(this.parseMapLibreExpression(arg));
                    }
                }
            }
            return group;
        }

        if (this.isConditionExpression(expression)) {
            return {
                id: this.generateTransientId(),
                operator: "all",
                conditions: [this.parseConditionExpression(expression)],
                groups: [],
            };
        }

        return {
            id: this.generateTransientId(),
            operator: "all",
            conditions: [],
            groups: [],
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
        }
        return { id: this.generateTransientId(), field, operator, value };
    }

    private convertToMapLibreExpression(
        group: FilterGroup
    ): MapLibreExpression {
        const expressions: MapLibreExpression[] = [];

        for (const condition of group.conditions) {
            if (condition.field) {
                expressions.push([
                    condition.operator,
                    ["get", condition.field],
                    condition.value,
                ]);
            }
        }

        for (const childGroup of group.groups) {
            const childExpression =
                this.convertToMapLibreExpression(childGroup);
            if (childExpression.length > 0) {
                expressions.push(childExpression);
            }
        }

        if (expressions.length === 0) return [];

        return [group.operator, ...expressions];
    }
}
