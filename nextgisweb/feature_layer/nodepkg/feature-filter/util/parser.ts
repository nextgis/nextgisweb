import type {
    ConditionExpr,
    FilterCondition,
    FilterExpression,
    FilterGroup,
} from "../type";

import { isConditionExpression } from "./validator";

export function parseConditionExpression(
    expression: ConditionExpr,
    nextId: () => number
): FilterCondition {
    const [operator, fieldExpression, value] = expression;
    let field = "";
    if (Array.isArray(fieldExpression) && fieldExpression[0] === "get") {
        field = fieldExpression[1];
    } else if (operator === "has" || operator === "!has") {
        if (Array.isArray(expression[1]) && expression[1][0] === "get") {
            field = expression[1][1];
        }
    }

    const baseCondition: FilterCondition = {
        id: nextId(),
        type: "condition",
        field,
        operator,
        value,
    };

    if (operator === "has" || operator === "!has") {
        return {
            ...baseCondition,
            value: undefined,
        };
    } else if (operator === "in" || operator === "!in") {
        return {
            ...baseCondition,
            value: Array.isArray(value) ? value : [],
        };
    }
    return {
        ...baseCondition,
        value,
    };
}

export function parseFilterExpression(
    expression: FilterExpression,
    nextId: () => number
): FilterGroup {
    if (!Array.isArray(expression) || expression.length === 0) {
        return {
            id: nextId(),
            type: "group",
            operator: "all",
            conditions: [],
            groups: [],
            childrenOrder: [],
        };
    }

    const [operator, ...args] = expression;

    if (operator === "all" || operator === "any") {
        const group: FilterGroup = {
            id: nextId(),
            type: "group",
            operator,
            conditions: [],
            groups: [],
            childrenOrder: [],
        };
        for (const arg of args) {
            if (Array.isArray(arg) && arg.length > 0) {
                if (isConditionExpression(arg)) {
                    const condition = parseConditionExpression(arg, nextId);
                    group.conditions.push(condition);
                    group.childrenOrder.push({
                        type: "condition",
                        id: condition.id,
                    });
                } else {
                    const childGroup = parseFilterExpression(arg, nextId);
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

    if (isConditionExpression(expression)) {
        const condition = parseConditionExpression(expression, nextId);
        return {
            id: nextId(),
            type: "group",
            operator: "all",
            conditions: [condition],
            groups: [],
            childrenOrder: [{ type: "condition", id: condition.id }],
        };
    }

    return {
        id: nextId(),
        type: "group",
        operator: "all",
        conditions: [],
        groups: [],
        childrenOrder: [],
    };
}
