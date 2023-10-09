import type { ResourceItem as ResourceItemBase } from "@nextgisweb/resource/type/Resource";

declare module "@nextgisweb/resource/type/Resource" {
    import type { GeometryType } from "@nextgisweb/feature-layer/type";

    export interface ResourceItem extends ResourceItemBase {
        vector_layer?: {
            geometry_type: GeometryType;
            srs: { id: number };
        };
    }
}
