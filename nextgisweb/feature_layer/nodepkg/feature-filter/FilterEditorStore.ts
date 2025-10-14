import { action, observable } from "mobx";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";

import { OPERATORS, ValidOperators } from "./type";
import type {
    CmpOp,
    ConditionExpr,
    ConditionValue,
    EqNeOp,
    FilterCondition,
    FilterExpression,
    FilterGroup,
    FilterState,
    GroupExpr,
    HasOp,
    InOp,
} from "./type";

export interface FilterEditorStoreOptions {
    fields: FeatureLayerFieldRead[];
    value?: string;
}

export class FilterEditorStore {
    @observable.shallow accessor fields: FeatureLayerFieldRead[] = [];
    @observable.deep accessor filterState: FilterState = {
        rootGroup: {
            id: 0,
            operator: "all",
            conditions: [],
            groups: [],
        },
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
    addCondition(groupId: number) {
        const newCondition: FilterCondition = {
            id: this.generateTransientId(),
            field: this.fields[0]?.keyname || "",
            operator: "==" as EqNeOp,
            value: null,
        };
        const group = this._findGroupById(this.filterState.rootGroup, groupId);
        if (group) {
            group.conditions.push(newCondition as FilterCondition);
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
            this.filterState.rootGroup,
            parentGroupId
        );
        if (parentGroup) {
            parentGroup.groups.push(newGroup);
            this.validateCurrentState();
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
        const expression = this.convertToFilterExpression(
            this.filterState.rootGroup
        );
        this.validateFilterExpression(expression);
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

    private parseFilterExpression(expression: any[]): FilterGroup {
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
                        group.groups.push(this.parseFilterExpression(arg));
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
        }

        for (const childGroup of group.groups) {
            const childExpression = this.convertToFilterExpression(childGroup);
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
            this.validJsonValue = JSON.stringify(expression);
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
        } else if (operator !== "has" && operator !== "!has") {
            const fieldType = field.datatype;
            const isTemporalField = ["DATE", "TIME", "DATETIME"].includes(
                fieldType
            );

            if (value !== null && value !== undefined && !isTemporalField) {
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
