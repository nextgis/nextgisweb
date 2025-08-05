import { action, observable } from "mobx";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";

import { ValidOperators } from "./type";
import type { FilterCondition, FilterGroup, MapLibreExpression } from "./type";

export interface FilterEditorStoreOptions {
    fields: FeatureLayerFieldRead[];
    value?: any[];
    onChange?: (value: any[]) => void;
}

export class FilterEditorStore {
    @observable.shallow accessor fields: FeatureLayerFieldRead[] = [];
    @observable.deep accessor filterState: FilterGroup = {
        id: this.generateTransientId(),
        operator: "all",
        conditions: [],
        groups: [],
    };
    @observable.ref accessor activeTab: string = "constructor";
    @observable.ref accessor jsonValue: string = "";

    private onChange?: (value: any[]) => void;
    private transientIdCounter = 0;

    constructor(options: FilterEditorStoreOptions) {
        this.fields = options.fields;
        this.onChange = options.onChange;

        if (options.value) {
            this.loadFilter(options.value);
        }
    }

    @action.bound
    setActiveTab(tab: string) {
        this.activeTab = tab;
    }

    @action.bound
    setJsonValue(value: string) {
        this.jsonValue = value;
    }

    @action.bound
    loadFilter(expression: any[]) {
        try {
            const filterState = this.parseMapLibreExpression(expression);
            this.filterState = filterState;
            this.jsonValue = JSON.stringify(expression, null, 2);
        } catch (error) {
            console.error("Failed to parse filter expression:", error);
            this.activeTab = "json";
            this.jsonValue = JSON.stringify(expression, null, 2);
        }
    }

    @action.bound
    addCondition(groupId: number, condition: Omit<FilterCondition, "id">) {
        const newCondition: FilterCondition = {
            ...condition,
            id: this.generateTransientId(),
        };

        this.addConditionToGroup(this.filterState, groupId, newCondition);
    }

    @action.bound
    updateCondition(conditionId: number, updates: Partial<FilterCondition>) {
        this.updateConditionInGroup(this.filterState, conditionId, updates);
    }

    @action.bound
    updateConditionField(conditionId: number, field: string) {
        this.updateConditionInGroup(this.filterState, conditionId, { field });
    }

    @action.bound
    updateConditionOperator(conditionId: number, operator: string) {
        this.updateConditionInGroup(this.filterState, conditionId, {
            operator,
        });
    }

    @action.bound
    updateConditionValue(conditionId: number, value: any) {
        this.updateConditionInGroup(this.filterState, conditionId, { value });
    }

    @action.bound
    updateGroupOperator(groupId: number, operator: "all" | "any") {
        this.updateGroupInGroup(this.filterState, groupId, { operator });
    }

    @action.bound
    deleteCondition(conditionId: number) {
        this.removeConditionFromGroup(this.filterState, conditionId);
    }

    @action.bound
    deleteGroup(groupId: number) {
        this.removeGroupFromGroup(this.filterState, groupId);
    }

    @action.bound
    removeCondition(conditionId: number) {
        this.removeConditionFromGroup(this.filterState, conditionId);
    }

    @action.bound
    addGroup(parentGroupId: number, operator: "all" | "any" = "all") {
        const newGroup: FilterGroup = {
            id: this.generateTransientId(),
            operator,
            conditions: [],
            groups: [],
        };

        this.addGroupToGroup(this.filterState, parentGroupId, newGroup);
    }

    @action.bound
    updateGroup(groupId: number, updates: Partial<FilterGroup>) {
        this.updateGroupInGroup(this.filterState, groupId, updates);
    }

    @action.bound
    removeGroup(groupId: number) {
        this.removeGroupFromGroup(this.filterState, groupId);
    }

    @action.bound
    moveCondition(conditionId: number, groupId: number, newIndex: number) {
        this.moveConditionInGroup(
            this.filterState,
            conditionId,
            groupId,
            newIndex
        );
    }

    @action.bound
    moveConditionBetweenGroups(
        conditionId: number,
        sourceGroupId: number,
        targetGroupId: number,
        newIndex: number
    ) {
        this.moveConditionBetweenGroupsInGroup(
            this.filterState,
            conditionId,
            sourceGroupId,
            targetGroupId,
            newIndex
        );
    }

    @action.bound
    moveGroup(groupId: number, targetGroupId: number, newIndex: number) {
        this.moveGroupInGroup(
            this.filterState,
            groupId,
            targetGroupId,
            newIndex
        );
    }

    toMapLibreExpression(): MapLibreExpression {
        if (this.activeTab === "json") {
            try {
                return JSON.parse(this.jsonValue);
            } catch (_error) {
                throw new Error("Invalid JSON", { cause: _error });
            }
        }

        return this.convertToMapLibreExpression(this.filterState);
    }

    private generateTransientId(): number {
        this.transientIdCounter += 1;
        return this.transientIdCounter;
    }

    private addConditionToGroup(
        group: FilterGroup,
        targetGroupId: number,
        condition: FilterCondition
    ): boolean {
        if (group.id === targetGroupId) {
            group.conditions.push(condition);
            return true;
        }

        for (const childGroup of group.groups) {
            if (
                this.addConditionToGroup(childGroup, targetGroupId, condition)
            ) {
                return true;
            }
        }

        return false;
    }

    private updateConditionInGroup(
        group: FilterGroup,
        conditionId: number,
        updates: Partial<FilterCondition>
    ): boolean {
        const condition = group.conditions.find((c) => c.id === conditionId);
        if (condition) {
            if (updates.field !== undefined) condition.field = updates.field;
            if (updates.operator !== undefined)
                condition.operator = updates.operator;
            if (updates.value !== undefined) condition.value = updates.value;
            return true;
        }

        for (const childGroup of group.groups) {
            if (this.updateConditionInGroup(childGroup, conditionId, updates)) {
                return true;
            }
        }

        return false;
    }

    private removeConditionFromGroup(
        group: FilterGroup,
        conditionId: number
    ): boolean {
        const index = group.conditions.findIndex((c) => c.id === conditionId);
        if (index !== -1) {
            group.conditions.splice(index, 1);
            return true;
        }

        for (const childGroup of group.groups) {
            if (this.removeConditionFromGroup(childGroup, conditionId)) {
                return true;
            }
        }

        return false;
    }

    private moveConditionInGroup(
        group: FilterGroup,
        conditionId: number,
        targetGroupId: number,
        newIndex: number
    ): boolean {
        if (group.id === targetGroupId) {
            const oldIndex = group.conditions.findIndex(
                (c) => c.id === conditionId
            );
            if (oldIndex !== -1) {
                const condition = group.conditions.splice(oldIndex, 1)[0];
                const adjustedIndex =
                    newIndex > oldIndex ? newIndex - 1 : newIndex;
                group.conditions.splice(adjustedIndex, 0, condition);
                return true;
            }
        }

        for (const childGroup of group.groups) {
            if (
                this.moveConditionInGroup(
                    childGroup,
                    conditionId,
                    targetGroupId,
                    newIndex
                )
            ) {
                return true;
            }
        }

        return false;
    }

    private moveConditionBetweenGroupsInGroup(
        group: FilterGroup,
        conditionId: number,
        sourceGroupId: number,
        targetGroupId: number,
        newIndex: number
    ): boolean {
        if (group.id === sourceGroupId) {
            const sourceIndex = group.conditions.findIndex(
                (c) => c.id === conditionId
            );
            if (sourceIndex !== -1) {
                const condition = group.conditions.splice(sourceIndex, 1)[0];

                if (group.id === targetGroupId) {
                    const adjustedIndex =
                        sourceIndex < newIndex ? newIndex - 1 : newIndex;
                    group.conditions.splice(adjustedIndex, 0, condition);
                } else {
                    const targetGroup = group.groups.find(
                        (g) => g.id === targetGroupId
                    );
                    if (targetGroup) {
                        targetGroup.conditions.splice(newIndex, 0, condition);
                        return true;
                    }
                }
                return true;
            }
        }

        if (group.id === targetGroupId) {
            const condition = this.findAndRemoveConditionFromGroup(
                group,
                conditionId
            );
            if (condition) {
                group.conditions.splice(newIndex, 0, condition);
                return true;
            }
        }

        for (const childGroup of group.groups) {
            if (
                this.moveConditionBetweenGroupsInGroup(
                    childGroup,
                    conditionId,
                    sourceGroupId,
                    targetGroupId,
                    newIndex
                )
            ) {
                return true;
            }
        }

        return false;
    }

    private findAndRemoveConditionFromGroup(
        group: FilterGroup,
        conditionId: number
    ): FilterCondition | null {
        const index = group.conditions.findIndex((c) => c.id === conditionId);
        if (index !== -1) {
            return group.conditions.splice(index, 1)[0];
        }

        for (const childGroup of group.groups) {
            const condition = this.findAndRemoveConditionFromGroup(
                childGroup,
                conditionId
            );
            if (condition) {
                return condition;
            }
        }

        return null;
    }

    private moveGroupInGroup(
        group: FilterGroup,
        groupId: number,
        targetGroupId: number,
        newIndex: number
    ): boolean {
        if (group.id === targetGroupId) {
            const sourceIndex = group.groups.findIndex((g) => g.id === groupId);
            if (sourceIndex !== -1) {
                const groupToMove = group.groups.splice(sourceIndex, 1)[0];
                const adjustedIndex =
                    sourceIndex < newIndex ? newIndex - 1 : newIndex;
                group.groups.splice(adjustedIndex, 0, groupToMove);
                return true;
            }
        }

        const sourceIndex = group.groups.findIndex((g) => g.id === groupId);
        if (sourceIndex !== -1) {
            const groupToMove = group.groups.splice(sourceIndex, 1)[0];

            if (group.id === targetGroupId) {
                const adjustedIndex =
                    sourceIndex < newIndex ? newIndex - 1 : newIndex;
                group.groups.splice(adjustedIndex, 0, groupToMove);
                return true;
            } else {
                const targetGroup = group.groups.find(
                    (g) => g.id === targetGroupId
                );
                if (targetGroup) {
                    targetGroup.groups.splice(newIndex, 0, groupToMove);
                    return true;
                }
            }
        }

        for (const childGroup of group.groups) {
            if (
                this.moveGroupInGroup(
                    childGroup,
                    groupId,
                    targetGroupId,
                    newIndex
                )
            ) {
                return true;
            }
        }

        return false;
    }

    private addGroupToGroup(
        group: FilterGroup,
        targetGroupId: number,
        newGroup: FilterGroup
    ): boolean {
        if (group.id === targetGroupId) {
            group.groups.push(newGroup);
            return true;
        }

        for (const childGroup of group.groups) {
            if (this.addGroupToGroup(childGroup, targetGroupId, newGroup)) {
                return true;
            }
        }

        return false;
    }

    private updateGroupInGroup(
        group: FilterGroup,
        groupId: number,
        updates: Partial<FilterGroup>
    ): boolean {
        if (group.id === groupId) {
            if (updates.operator !== undefined)
                group.operator = updates.operator;
            return true;
        }

        for (const childGroup of group.groups) {
            if (this.updateGroupInGroup(childGroup, groupId, updates)) {
                return true;
            }
        }

        return false;
    }

    private removeGroupFromGroup(group: FilterGroup, groupId: number): boolean {
        const index = group.groups.findIndex((g) => g.id === groupId);
        if (index !== -1) {
            group.groups.splice(index, 1);
            return true;
        }

        for (const childGroup of group.groups) {
            if (this.removeGroupFromGroup(childGroup, groupId)) {
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

        return {
            id: this.generateTransientId(),
            operator: "all",
            conditions: [],
            groups: [],
        };
    }

    private isConditionExpression(expression: any[]): boolean {
        if (!Array.isArray(expression) || expression.length < 3) {
            return false;
        }
        const [operator] = expression;
        return ValidOperators.includes(operator);
    }

    private parseConditionExpression(expression: any[]): FilterCondition {
        const [operator, fieldExpression, value] = expression;

        let field = "";
        if (Array.isArray(fieldExpression) && fieldExpression[0] === "get") {
            field = fieldExpression[1];
        }

        return {
            id: this.generateTransientId(),
            field,
            operator,
            value,
        };
    }

    private convertToMapLibreExpression(
        group: FilterGroup
    ): MapLibreExpression {
        const expressions: any[] = [];

        for (const condition of group.conditions) {
            expressions.push([
                condition.operator,
                ["get", condition.field],
                condition.value,
            ]);
        }

        for (const childGroup of group.groups) {
            expressions.push(this.convertToMapLibreExpression(childGroup));
        }

        if (expressions.length === 0) {
            return [];
        }

        if (expressions.length === 1) {
            return expressions[0];
        }

        return [group.operator, ...expressions];
    }
}
