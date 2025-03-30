import type { FC } from "react";

import type { CompositeRead } from "@nextgisweb/resource/type/api";

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
