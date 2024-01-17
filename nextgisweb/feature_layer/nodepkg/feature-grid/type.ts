import type { ActionToolbarAction } from "@nextgisweb/gui/action-toolbar";
import type { SizeType } from "@nextgisweb/gui/antd";
import type { ResourceItem } from "@nextgisweb/resource/type/Resource";

import type { NgwAttributeType } from "../type";
import type { FeatureLayerField } from "../type/FeatureLayer";

import type { QueryParams } from "./hook/useFeatureTable";

export type FeatureAttrs = Record<string, NgwAttributeType> & {
    __rowIndex?: number;
};

export type SetValue<T> = ((prevValue: T) => T) | T;

export type ColOrder = "asc" | "desc" | null;

export type OrderBy = [keynme: string, ordering: ColOrder];

export interface FeatureLayerFieldCol extends FeatureLayerField {
    flex?: string;
}

export type EffectiveWidths = Record<string, number>;

export interface ActionProps {
    id: number;
    size?: SizeType;
    selectedIds?: number[];
}

export interface FeatureGridProps {
    id: number;
    size?: SizeType;
    actions?: ActionToolbarAction<ActionProps>[];
    version?: number;
    readonly?: boolean;
    queryParams?: QueryParams;
    selectedIds?: number[];
    editOnNewPage?: boolean;
    cleanSelectedOnFilter?: boolean;
    beforeDelete?: (featureIds: number[]) => void;
    deleteError?: (featureIds: number[]) => void;
    onSelect?: (selected: number[]) => void;
    onDelete?: (featureIds: number[]) => void;
    onSave?: (value: ResourceItem | undefined) => void;
}
