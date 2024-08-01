import type { Attrs, FeatureItem } from "@nextgisweb/feature-layer/type";

import type { DojoDisplay } from "../../type";

export interface LayerResponse {
    features: FeatureIdentify[];
    featureCount: number;
}

export type IdentifyResponse = Record<"featureCount", number> &
    Record<string, LayerResponse>;

export interface IdentifyInfo {
    response: IdentifyResponse;
    layerLabels: Record<string, string>;
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
    display: DojoDisplay;
    featureInfo?: FeatureInfo;
    featureItem?: FeatureItem;
    featuresInfoList: FeatureInfo[];
    onFeatureChange: (featureInfoSelected: FeatureInfo) => void;
}

export interface IdentifyExtensionComponentProps {
    featureItem: FeatureItem;
    resourceId: number;
}

export interface FieldsTableProps {
    featureInfo: FeatureInfo;
    featureItem: FeatureItem;
}

export interface FeatureTabsProps {
    display: DojoDisplay;
    featureInfo: FeatureInfo;
    featureItem: FeatureItem;
    onUpdate: () => void;
}

export interface IdentifyResultProps {
    identifyInfo: IdentifyInfo;
    display: DojoDisplay;
}

export interface FeatureEditButtonProps {
    display: DojoDisplay;
    featureId: number;
    resourceId: number;
    onUpdate: () => void;
}

export interface IdentificationPanelProps {
    display: DojoDisplay;
    identifyInfo: IdentifyInfo;
    title: string;
    close: () => void;
}
