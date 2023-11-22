import type { ResourceItem as ResourceItemBase } from "@nextgisweb/resource/type/Resource";

declare module "@nextgisweb/resource/type/Resource" {
    export interface ResourceItem extends ResourceItemBase {
        // eslint-disable-next-line @typescript-eslint/consistent-type-imports
        lookup_table?: import("./type/LookupTableResource").LookupTableResource;
    }
}
