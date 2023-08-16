import type { ResourceItem as ResourceItemBase } from "@nextgisweb/resource/type/Resource";

declare module "@nextgisweb/resource/type/Resource" {
    export interface ResourceItem extends ResourceItemBase {
        feature_layer?: import("./type/FeatureLayer").FeatureLayer;
    }
}