import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";

import type {
  ConditionExpr,
  FilterExpression,
  FilterExpressionString,
  GroupExpr,
} from "../type";

import {
  isConditionExpression,
  isGroupExpression,
  validateConditionExpression,
  validateFilterExpression,
} from "./validator";

function isConditionAvailable(
  expression: ConditionExpr,
  fields: FeatureLayerFieldRead[]
): boolean {
  try {
    validateConditionExpression(expression, fields);
    return true;
  } catch {
    return false;
  }
}

function pruneExpressionNode(
  expression: unknown,
  fields: FeatureLayerFieldRead[]
): FilterExpression | ConditionExpr | undefined {
  if (!Array.isArray(expression) || expression.length === 0) {
    return undefined;
  }

  if (isConditionExpression(expression)) {
    return isConditionAvailable(expression, fields) ? expression : undefined;
  }

  if (isGroupExpression(expression)) {
    const [operator, ...children] = expression;

    const prunedChildren = children
      .map((child) => pruneExpressionNode(child, fields))
      .filter(
        (child): child is ConditionExpr | GroupExpr => child !== undefined
      );

    if (prunedChildren.length === 0) {
      return undefined;
    }

    return [operator, ...prunedChildren];
  }

  return undefined;
}

export function pruneFilterExpressionByFields(
  value: FilterExpressionString | undefined,
  fields: FeatureLayerFieldRead[]
): FilterExpressionString | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const expression = JSON.parse(value);
    const prunedExpression = pruneExpressionNode(expression, fields);

    if (!prunedExpression) {
      return undefined;
    }

    validateFilterExpression(prunedExpression, fields);

    return JSON.stringify(prunedExpression) as FilterExpressionString;
  } catch {
    return undefined;
  }
}
