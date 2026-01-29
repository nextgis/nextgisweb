import type { ResourceAttrItem } from "@nextgisweb/resource/api/ResourceAttrItem";
import type { Attributes } from "@nextgisweb/resource/api/resource-attr";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import type { DefaultAttributes } from "./ResourceSectionChildren";

export interface ChildrenResource<
    A extends Attributes[number][] = typeof DefaultAttributes,
> {
    id: number;
    cls: ResourceCls;
    displayName: string;
    clsDisplayName?: string;
    creationDate?: string;
    ownerUserDisplayName?: string;

    it: ResourceAttrItem<A>;
}
