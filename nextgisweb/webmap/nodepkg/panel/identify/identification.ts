import type { Attrs, FeatureItem } from "@nextgisweb/feature-layer/type";
import type { RasterLayerIdentifyItem } from "@nextgisweb/raster-layer/type/api";
import type { Display } from "@nextgisweb/webmap/display";

export interface LayerResponse {
    features: FeatureIdentify[];
    featureCount: number;
}

// TODO: replace by RouteResp<"feature_layer.identify", "post">
export type FeatureResponse = Record<"featureCount", number> &
    Record<number, LayerResponse>;

export type IdentifyResponse = Record<"featureCount", number> &
    Record<number, LayerResponse | RasterLayerIdentifyItem>;

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
    parent?: string;
}

interface BaseFeatureInfo {
    value: string;
    label: string;
    layerId: number;
    type: string;
}

export interface FeatureInfo extends BaseFeatureInfo {
    id: number;
    idx: number;
    value: string;
    label: string;
    layerId: number;
    type: "feature_layer";
}
export interface RasterInfo extends BaseFeatureInfo {
    value: string;
    label: string;
    layerId: number;
    type: "raster_layer";
}

export type IdentifyInfoItem = FeatureInfo | RasterInfo;

export interface FeatureSelectorProps {
    display: Display;
    featureInfo?: IdentifyInfoItem;
    featureItem?: FeatureItem;
    featuresInfoList: IdentifyInfoItem[];
    onFeatureChange: (
        featureInfoSelected: IdentifyInfoItem | undefined
    ) => void;
}

export interface IdentifyExtensionComponentProps<F extends Attrs = Attrs> {
    featureItem: FeatureItem<F>;
    resourceId: number;
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
