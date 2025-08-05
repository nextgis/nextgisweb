import { action, observable } from "mobx";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";

import { OPERATORS, ValidOperators } from "./type";
import type {
    CmpOp,
    ConditionExpr,
    EqNeOp,
    FilterCondition,
    FilterGroup,
    GroupExpr,
    InOp,
    MapLibreExpression,
} from "./type";

export interface FilterEditorStoreOptions {
    fields: FeatureLayerFieldRead[];
    value?: string;
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
    @observable accessor validationError: string | undefined = undefined;
    @observable accessor validJsonValue: string | undefined = undefined;

    private transientIdCounter = 0;

    constructor(options: FilterEditorStoreOptions) {
        this.fields = options.fields;
        if (options.value) {
            this.loadFilter(options.value);
        } else {
            this.filterState.id = this.generateTransientId();
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
                    this.validateMapLibreExpression(parsedJson);
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
        this.validateCurrentState();
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
            this.validateCurrentState();
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
            this.validateCurrentState();
        }
    }

    @action.bound
    updateCondition(conditionId: number, updates: Partial<FilterCondition>) {
        this._updateConditionInTree(this.filterState, conditionId, updates);
        this.validateCurrentState();
    }

    @action.bound
    updateGroupOperator(groupId: number, operator: "all" | "any") {
        const group = this._findGroupById(this.filterState, groupId);
        if (group) {
            group.operator = operator;
            this.validateCurrentState();
        }
    }

    @action.bound
    deleteCondition(conditionId: number) {
        this._findAndRemoveCondition(this.filterState, conditionId);
        this.validateCurrentState();
    }

    @action.bound
    deleteGroup(groupId: number) {
        if (groupId === this.filterState.id) {
            console.warn("Cannot delete the root group.");
            return;
        }
        this._findAndRemoveGroup(this.filterState, groupId);
        this.validateCurrentState();
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
        this.validateCurrentState();
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
        this.validateCurrentState();
    }

    @action.bound
    loadFilter(value: string) {
        try {
            this.transientIdCounter = Date.now();
            const expression = JSON.parse(value);
            this.validateMapLibreExpression(expression);
            const filterState = this.parseMapLibreExpression(expression);
            this.filterState = filterState;
            this.isValid = true;
            this.activeTab = "constructor";
        } catch (error) {
            console.error("Failed to parse filter expression:", error);
            this.activeTab = "json";
            this.isValid = false;
            this.validationError =
                error instanceof Error ? error.message : "Invalid filter value";
        }
        this.jsonValue = value;
    }

    toMapLibreExpression(): MapLibreExpression {
        if (this.activeTab === "json" && this.jsonValue) {
            try {
                const parsed = JSON.parse(this.jsonValue);
                this.validateMapLibreExpression(parsed);
                this.isValid = true;
                return parsed;
            } catch (_error) {
                this.isValid = false;
                throw new Error("Invalid JSON or filter structure", {
                    cause: _error,
                });
            }
        }
        const expression = this.convertToMapLibreExpression(this.filterState);
        this.validateMapLibreExpression(expression);
        return expression;
    }

    toJsonString(): string | undefined {
        if (this.activeTab === "json" && this.jsonValue) {
            try {
                const parsed = JSON.parse(this.jsonValue);
                this.validateMapLibreExpression(parsed);
                this.isValid = true;
                return this.jsonValue;
            } catch (_error) {
                this.isValid = false;
                throw new Error("Invalid JSON or filter structure", {
                    cause: _error,
                });
            }
        }
        const expression = this.convertToMapLibreExpression(this.filterState);
        this.validateMapLibreExpression(expression);
        return JSON.stringify(expression);
    }

    getValidJsonValue(): string | undefined {
        return this.validJsonValue;
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
        } else if (operator === "has" || operator === "!has") {
            if (Array.isArray(expression[1]) && expression[1][0] === "get") {
                field = expression[1][1];
            }
        }
        return { id: this.generateTransientId(), field, operator, value };
    }

    private convertToMapLibreExpression(
        group: FilterGroup
    ): MapLibreExpression {
        const expressions: (ConditionExpr | GroupExpr)[] = [];

        for (const condition of group.conditions) {
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
                    expressions.push([
                        condition.operator as EqNeOp | CmpOp | InOp,
                        ["get", condition.field],
                        condition.value,
                    ]);
                }
            }
        }

        for (const childGroup of group.groups) {
            const childExpression =
                this.convertToMapLibreExpression(childGroup);
            if (childExpression.length > 1) {
                expressions.push(childExpression as GroupExpr);
            }
        }

        if (expressions.length === 0) return [];

        return [group.operator, ...expressions];
    }

    @action.bound
    private validateCurrentState() {
        try {
            let expression: MapLibreExpression;
            if (this.activeTab === "json" && this.jsonValue) {
                const parsed = JSON.parse(this.jsonValue);
                this.validateMapLibreExpression(parsed);
                expression = parsed;
            } else {
                expression = this.convertToMapLibreExpression(this.filterState);
                this.validateMapLibreExpression(expression);
            }
            this.isValid = true;
            this.validationError = undefined;
            this.validJsonValue = JSON.stringify(expression);
        } catch (error) {
            this.isValid = false;
            this.validationError =
                error instanceof Error ? error.message : "Validation failed";
            this.validJsonValue = undefined;
        }
    }

    private validateMapLibreExpression(expression: any[]): void {
        if (!Array.isArray(expression)) {
            throw new Error("Expression must be an array");
        }

        if (expression.length === 0) {
            return;
        }

        const [operator, ...args] = expression;

        if (operator === "all" || operator === "any") {
            if (args.length === 0) {
                throw new Error(
                    "Group operator must have at least one argument"
                );
            }
            for (const arg of args) {
                if (!Array.isArray(arg)) {
                    throw new Error(
                        "All arguments to group operator must be arrays"
                    );
                }
                this.validateMapLibreExpression(arg);
            }
            return;
        }

        if (this.isConditionExpression(expression)) {
            this.validateConditionExpression(expression);
            return;
        }

        throw new Error(`Unknown or invalid root operator: ${operator}`);
    }

    private validateConditionExpression(expression: any[]): void {
        const [operator, fieldExpression, value] = expression;

        if (!ValidOperators.includes(operator)) {
            throw new Error(`Invalid operator: ${operator}`);
        }

        if (operator === "has" || operator === "!has") {
            if (expression.length !== 2) {
                throw new Error(
                    `Operator '${operator}' expects 1 argument, but got ${expression.length - 1}`
                );
            }
        } else {
            if (expression.length !== 3) {
                throw new Error(
                    `Operator '${operator}' expects 2 arguments, but got ${expression.length - 1}`
                );
            }
        }

        if (!Array.isArray(fieldExpression) || fieldExpression[0] !== "get") {
            throw new Error("Field expression must be ['get', fieldName]");
        }

        if (typeof fieldExpression[1] !== "string") {
            throw new Error("Field name must be a string");
        }

        const fieldName = fieldExpression[1];
        const field = this.fields.find((f) => f.keyname === fieldName);
        if (!field) {
            throw new Error(`Unknown field: ${fieldName}`);
        }

        const operatorOption = OPERATORS.find((op) => op.value === operator);
        if (
            operatorOption &&
            !operatorOption.supportedTypes.includes(field.datatype)
        ) {
            throw new Error(
                `Operator '${operator}' is not supported for field type '${field.datatype}'`
            );
        }

        if (operator === "in" || operator === "!in") {
            if (!Array.isArray(value)) {
                throw new Error(
                    `Value for operator '${operator}' must be an array.`
                );
            }
        } else if (operator !== "has" && operator !== "!has") {
            const valueType = typeof value;
            const fieldType = field.datatype;
            if (
                (fieldType === "INTEGER" ||
                    fieldType === "BIGINT" ||
                    fieldType === "REAL") &&
                valueType !== "number"
            ) {
                throw new Error(
                    `Field '${fieldName}' expects a number, but got a ${valueType}.`
                );
            }
        }
    }
}
