import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

export interface FeatureFilterEditorProps {
    fields: FeatureLayerFieldRead[];
    value?: any[];
    onChange?: (value: any[]) => void;
}

export interface FilterCondition {
    id: number;
    field: string;
    operator: string;
    value: any;
}

export interface FilterGroup {
    id: number;
    operator: "all" | "any";
    conditions: FilterCondition[];
    groups: FilterGroup[];
}

export interface FilterState {
    groups: FilterGroup[];
}

export type MapLibreExpression = any[];

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
] as const;

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
        supportedTypes: ["STRING", "INTEGER", "BIGINT", "REAL"],
    },
    {
        value: "!has",
        label: gettext("Not has value"),
        supportedTypes: ["STRING", "INTEGER", "BIGINT", "REAL"],
    },
];
