import type { ResourceAttrItem } from "@nextgisweb/resource/api/ResourceAttrItem";
import type { Attributes } from "@nextgisweb/resource/api/resource-attr";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import type { DefaultResourceSectionAttrs } from "../type";

export interface ChildrenResource<
    A extends Attributes[number][] = typeof DefaultResourceSectionAttrs,
> {
    cls: ResourceCls;
    resourceId: number;
    displayName: string;
    clsDisplayName?: string;
    creationDate?: string;
    ownerUserDisplayName?: string;

    it: ResourceAttrItem<A>;
}
