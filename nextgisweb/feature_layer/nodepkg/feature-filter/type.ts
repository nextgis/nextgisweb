import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

export type FilterExpressionString = string & {
    readonly __brand: "FilterExpressionString";
};

export interface FeatureFilterEditorProps {
    fields: FeatureLayerFieldRead[];
    value?: FilterExpressionString | undefined;
    onChange?: (value: FilterExpressionString | undefined) => void;
    onValidityChange?: (isValid: boolean) => void;
    showFooter?: boolean;
    onApply?: (value: FilterExpressionString | undefined) => void;
    onCancel?: (value: FilterExpressionString | undefined) => void;
}

export interface FilterState {
    rootGroup: FilterGroup;
}

export type ActiveTab = "constructor" | "json";

export interface FilterGroup {
    id: number;
    type: "group";
    operator: LogicalOp;
    conditions: FilterCondition[];
    groups: FilterGroup[];
    childrenOrder: FilterGroupChild[];
}

export type FilterGroupChild =
    | { type: "condition"; id: number }
    | { type: "group"; id: number };

export type FilterCondition<O extends Operator = Operator> = {
    id: number;
    type: "condition";
    field: string;
    operator: O;
    value: OperatorValueMap[Operator];
};

export type GetExpr = ["get", string];

export type EqNeOp = "==" | "!=";
export type CmpOp = ">" | "<" | ">=" | "<=";
export type InOp = "in" | "!in";
export type IsNullOp = "is_null" | "!is_null";

export type ConditionValue = string | number | boolean | null;

export type EqNeExpr = [EqNeOp, GetExpr, ConditionValue];
export type CmpExpr = [CmpOp, GetExpr, number | string];
export type InExpr = [InOp, GetExpr, ...(string | number)[]];
export type IsNullExpr = [IsNullOp, GetExpr];

export type ConditionExpr = EqNeExpr | CmpExpr | InExpr | IsNullExpr;

export type LogicalOp = "all" | "any";
export type GroupExpr = [LogicalOp, ...(ConditionExpr | GroupExpr)[]];
export type FilterExpression = [] | GroupExpr;

export const ValidOperators = [
    "==",
    "!=",
    ">",
    "<",
    ">=",
    "<=",
    "in",
    "!in",
    "is_null",
    "!is_null",
] as const;

export type Operator = (typeof ValidOperators)[number];

export type OperatorValueMap = {
    "==": ConditionValue;
    "!=": ConditionValue;
    ">": number;
    "<": number;
    ">=": number;
    "<=": number;
    "in": Array<string | number>;
    "!in": Array<string | number>;
    "is_null": undefined;
    "!is_null": undefined;
};

export interface OperatorOption {
    value: Operator;
    label: string;
    supportedTypes: FeatureLayerFieldRead["datatype"][];
}

export const OPERATORS: OperatorOption[] = [
    {
        value: "==",
        label: gettext("Equal"),
        supportedTypes: [
            "STRING",
            "INTEGER",
            "BIGINT",
            "REAL",
            "DATE",
            "TIME",
            "DATETIME",
        ],
    },
    {
        value: "!=",
        label: gettext("Not equal"),
        supportedTypes: [
            "STRING",
            "INTEGER",
            "BIGINT",
            "REAL",
            "DATE",
            "TIME",
            "DATETIME",
        ],
    },
    {
        value: ">",
        label: gettext("Greater"),
        supportedTypes: [
            "INTEGER",
            "BIGINT",
            "REAL",
            "DATE",
            "TIME",
            "DATETIME",
        ],
    },
    {
        value: "<",
        label: gettext("Less"),
        supportedTypes: [
            "INTEGER",
            "BIGINT",
            "REAL",
            "DATE",
            "TIME",
            "DATETIME",
        ],
    },
    {
        value: ">=",
        label: gettext("Greater or equal"),
        supportedTypes: [
            "INTEGER",
            "BIGINT",
            "REAL",
            "DATE",
            "TIME",
            "DATETIME",
        ],
    },
    {
        value: "<=",
        label: gettext("Less or equal"),
        supportedTypes: [
            "INTEGER",
            "BIGINT",
            "REAL",
            "DATE",
            "TIME",
            "DATETIME",
        ],
    },
    {
        value: "in",
        label: gettext("In list"),
        supportedTypes: ["STRING", "INTEGER", "BIGINT", "REAL"],
    },
    {
        value: "!in",
        label: gettext("Not in list"),
        supportedTypes: ["STRING", "INTEGER", "BIGINT", "REAL"],
    },
    {
        value: "is_null",
        label: gettext("Is NULL"),
        supportedTypes: [
            "STRING",
            "INTEGER",
            "BIGINT",
            "REAL",
            "DATE",
            "TIME",
            "DATETIME",
        ],
    },
    {
        value: "!is_null",
        label: gettext("Is not NULL"),
        supportedTypes: [
            "STRING",
            "INTEGER",
            "BIGINT",
            "REAL",
            "DATE",
            "TIME",
            "DATETIME",
        ],
    },
];
