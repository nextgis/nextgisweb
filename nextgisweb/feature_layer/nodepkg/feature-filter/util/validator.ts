import dayjs from "dayjs";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";

import { OPERATORS, ValidOperators } from "../type";
import type { ConditionExpr, FilterExpression, Operator } from "../type";

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

export function isConditionExpression(
    expression: unknown
): expression is ConditionExpr {
    if (
        !Array.isArray(expression) ||
        expression.length < 2 ||
        typeof expression[0] !== "string"
    ) {
        return false;
    }
    const operator = expression[0] as Operator;
    return ValidOperators.includes(operator);
}

function validateDateTimeValue(
    fieldType: FeatureLayerFieldRead["datatype"],
    value: unknown,
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

export function validateConditionExpression(
    expression: unknown,
    fields: FeatureLayerFieldRead[]
): expression is ConditionExpr {
    if (!Array.isArray(expression)) {
        throw new Error(gettext("Condition Expression must be an array"));
    }

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
        throw new Error(gettext("Field expression must be ['get', fieldName]"));
    }

    if (typeof fieldExpression[1] !== "string") {
        throw new Error(gettext("Field name must be a string"));
    }

    const fieldName = fieldExpression[1];
    const field = fields.find((f) => f.keyname === fieldName);
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
                gettextf("Value for operator '{operator}' must be an array.")({
                    operator,
                })
            );
        }
        if (isTemporalDatatype(field.datatype)) {
            for (const item of value) {
                validateDateTimeValue(field.datatype, item, fieldName);
            }
        }
    } else if (operator !== "has" && operator !== "!has") {
        const fieldType = field.datatype;
        const isTemporalField = isTemporalDatatype(fieldType);

        if (value !== null && value !== undefined) {
            if (isTemporalField) {
                validateDateTimeValue(fieldType, value, fieldName);
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

    return true;
}

export function validateFilterExpression(
    expression: unknown,
    fields: FeatureLayerFieldRead[]
): expression is FilterExpression {
    if (!Array.isArray(expression)) {
        throw new Error(gettext("Expression must be an array"));
    }

    if (expression.length === 0) {
        return true;
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
                    gettext("All arguments to group operator must be arrays")
                );
            }
            validateFilterExpression(arg, fields);
        }
        return true;
    }

    if (isConditionExpression(expression)) {
        validateConditionExpression(expression, fields);
        return true;
    }

    throw new Error(
        gettextf("Unknown or invalid root operator: '{operator}'")({
            operator,
        })
    );
}
