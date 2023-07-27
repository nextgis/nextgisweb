import { FeatureLayer } from "./type/FeatureLayer";

declare module "@nextgisweb/resource/type" {
    export interface ResourceItem {
        feature_layer: FeatureLayer;
    }
}
