import type { ResourceItem as ResourceItemBase } from "@nextgisweb/resource/type/Resource";

declare module "@nextgisweb/resource/type/Resource" {
    import type { FeatureLayer } from "./type/FeatureLayer";

    export interface ResourceItem extends ResourceItemBase {
        feature_layer?: FeatureLayer;
    }
}
