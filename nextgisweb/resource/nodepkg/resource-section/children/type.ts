import type { ResourceCls } from "@nextgisweb/resource/type/api";

export type ChildrenResourceAction = {
    href: string;
    target?: "_self" | "_blank";
    title: string;
    icon: string;
    key: string[];
};

export type ChildrenResource = {
    id: number;
    cls: ResourceCls;
    displayName: string;
    clsDisplayName?: string;
    creationDate?: string;
    ownerUserDisplayName?: string;
};
