import type { FC } from "react";

import type { CompositeRead } from "@nextgisweb/resource/type/api";

import type { ResourceAttrItem } from "../api/ResourceAttrItem";
import type { Attributes } from "../api/resource-attr";

export const DefaultResourceSectionAttrs = [
    ["resource.cls"],
    ["resource.display_name"],
    ["resource.owner_user"],
    ["resource.creation_date"],
] as const satisfies Attributes;

export type DefaultResourceAttrItem = ResourceAttrItem<
    typeof DefaultResourceSectionAttrs
>;

export interface ResourceSectionProps {
    resourceId: number;
    resourceData: CompositeRead;
    hideSection: () => void;
}

export type ResourceSection<
    P extends ResourceSectionProps = ResourceSectionProps,
> = FC<P> & {
    title?: string;
};
