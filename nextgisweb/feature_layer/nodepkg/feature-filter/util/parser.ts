import type {
  ConditionExpr,
  ConditionValue,
  FieldRef,
  FilterCondition,
  FilterExpression,
  FilterGroup,
} from "../type";

import { expressionToFieldRef } from "./field-ref";
import { isConditionExpression } from "./validator";

function extractConditionFieldRef(expression: unknown): FieldRef {
  const fieldRef = expressionToFieldRef(expression);
  if (!fieldRef) {
    throw new Error("Invalid field expression");
  }

  return fieldRef;
}

function unescapeIlikeValue(value: string): string {
  return value.replace(/\\([\\%_])/g, "$1");
}

function normalizeConditionValue(
  operator: ConditionExpr[0],
  value: ConditionValue | undefined
): ConditionValue | undefined {
  if (
    (operator === "ilike" || operator === "!ilike") &&
    typeof value === "string"
  ) {
    if (value.startsWith("%") && value.endsWith("%") && value.length >= 2) {
      return unescapeIlikeValue(value.slice(1, -1));
    }

    return value;
  }

  return value;
}

export function parseConditionExpression(
  expression: ConditionExpr,
  nextId: () => number
): FilterCondition {
  const [operator, fieldExpression, ...rest] = expression;
  const value = normalizeConditionValue(operator, rest[0]);
  const field = extractConditionFieldRef(fieldExpression);

  const baseCondition: FilterCondition = {
    id: nextId(),
    type: "condition",
    field,
    operator,
    value,
  };

  if (operator === "is_null" || operator === "!is_null") {
    return {
      ...baseCondition,
      value: undefined,
    };
  } else if (operator === "in" || operator === "!in") {
    return {
      ...baseCondition,
      value: rest as Array<string | number>,
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
