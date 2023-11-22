import type { ResourceItem as ResourceItemBase } from "@nextgisweb/resource/type/Resource";

declare module "@nextgisweb/resource/type/Resource" {
    import type { LookupTableResource } from "./type/LookupTableResource";

    export interface ResourceItem extends ResourceItemBase {
        lookup_table?: LookupTableResource;
    }
}
