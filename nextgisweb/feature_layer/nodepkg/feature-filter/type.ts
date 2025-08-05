import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

export interface FeatureFilterEditorProps {
    fields: FeatureLayerFieldRead[];
    value?: string | undefined;
    onChange?: (value: string | undefined) => void;
    onValidityChange?: (isValid: boolean) => void;
    showFooter?: boolean;
    onApply?: (value: string | undefined) => void;
    onCancel?: (value: string | undefined) => void;
}

export interface FilterState {
    rootGroup: FilterGroup;
}

export interface FilterGroup {
    id: number;
    operator: "all" | "any";
    conditions: FilterCondition[];
    groups: FilterGroup[];
    childrenOrder: FilterGroupChild[];
}

export type FilterGroupChild =
    | { type: "condition"; id: number }
    | { type: "group"; id: number };

export type FilterCondition =
    | {
          id: number;
          field: string;
          operator: EqNeOp | CmpOp;
          value: ConditionValue;
      }
    | {
          id: number;
          field: string;
          operator: InOp;
          value: Array<string | number>;
      }
    | { id: number; field: string; operator: HasOp; value: undefined };

export type GetExpr = ["get", string];

export type EqNeOp = "==" | "!=";
export type CmpOp = ">" | "<" | ">=" | "<=";
export type InOp = "in" | "!in";
export type HasOp = "has" | "!has";

export type ConditionValue = string | number | boolean | null;

export type EqNeExpr = [EqNeOp, GetExpr, ConditionValue];
export type CmpExpr = [CmpOp, GetExpr, number | string];
export type InExpr = [InOp, GetExpr, Array<string | number>];
export type HasExpr = [HasOp, GetExpr];

export type ConditionExpr = EqNeExpr | CmpExpr | InExpr | HasExpr;

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
    "has",
    "!has",
];

export type Operator = (typeof ValidOperators)[number];

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
        label: gettext("In"),
        supportedTypes: ["STRING", "INTEGER", "BIGINT", "REAL"],
    },
    {
        value: "!in",
        label: gettext("Not in"),
        supportedTypes: ["STRING", "INTEGER", "BIGINT", "REAL"],
    },
    {
        value: "has",
        label: gettext("Has value"),
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
        value: "!has",
        label: gettext("Not has value"),
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
