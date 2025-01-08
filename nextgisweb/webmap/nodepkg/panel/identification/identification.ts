import type { Attrs, FeatureItem } from "@nextgisweb/feature-layer/type";
import type { Display } from "@nextgisweb/webmap/display";
import type { PanelComponentProps } from "@nextgisweb/webmap/panels-manager/type";

import type { IdentifyStore } from "./IdentifyStore";

export interface LayerResponse {
    features: FeatureIdentify[];
    featureCount: number;
}

export type IdentifyResponse = Record<"featureCount", number> &
    Record<string, LayerResponse>;

export interface IdentifyInfo {
    response: IdentifyResponse;
    layerLabels: Record<string, string | null>;
    point: number[];
}

export interface FeatureIdentify<F extends Attrs = Attrs> {
    id: number;
    layerId: number;
    label: string;
    fields: F;
    parent: string;
}

export interface FeatureInfo {
    id: number;
    idx: number;
    value: string;
    label: string;
    layerId: number;
}

export interface FeatureSelectorProps {
    display: Display;
    featureInfo?: FeatureInfo;
    featureItem?: FeatureItem;
    featuresInfoList: FeatureInfo[];
    onFeatureChange: (featureInfoSelected: FeatureInfo | undefined) => void;
}

export interface IdentifyExtensionComponentProps<F extends Attrs = Attrs> {
    featureItem: FeatureItem<F>;
    resourceId: number;
}

export interface FieldsTableProps {
    featureInfo: FeatureInfo;
    featureItem: FeatureItem;
}

export interface FeatureTabsProps {
    display: Display;
    featureInfo: FeatureInfo;
    featureItem: FeatureItem;
    onUpdate: () => void;
}

export interface IdentifyResultProps {
    identifyInfo: IdentifyInfo;
    display: Display;
}

export interface FeatureEditButtonProps {
    display: Display;
    featureId: number;
    resourceId: number;
    onUpdate: () => void;
}

export interface IdentificationPanelProps extends PanelComponentProps {
    store: IdentifyStore;
    identifyInfo: IdentifyInfo;
}
