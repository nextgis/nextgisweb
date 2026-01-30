/** @registry */

import type React from "react";
import type { FC, LazyExoticComponent } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { ResourceAttrItem } from "@nextgisweb/resource/api/ResourceAttrItem";
import type { Attributes } from "@nextgisweb/resource/api/resource-attr";

import type { DefaultAttributes } from "./children/ResourceSectionChildren";
import type { ChildrenResource } from "./children/type";

export type ResourceActionWidgetProps<P = unknown> = P &
    Pick<ResourceAction, "label" | "icon"> &
    ChildrenResource & {
        target: React.ReactElement;
        setTableItems: React.Dispatch<React.SetStateAction<ChildrenResource[]>>;
    };

export type ResourceActionWidget<P = unknown> = LazyExoticComponent<
    FC<ResourceActionWidgetProps<P>>
>;

type CustomChildrenRes<A extends Attributes = Attributes> = Omit<
    ChildrenResource,
    "it"
> & { it: ResourceAttrItem<[...typeof DefaultAttributes, ...A]> };

export interface ResourceAction<
    P = unknown,
    A extends Attributes = Attributes,
> {
    key: string;
    href?: string | ((opt: CustomChildrenRes<A>) => string);
    icon?: React.ReactNode;
    order?: number;
    props?: P;
    label?: string;
    target?: "_self" | "_blank";
    widget?: ResourceActionWidget<P>;
    attributes?: [...A];
    hideOnMobile?: boolean;
    showInActionColumn?: boolean;
    condition?: (opt: CustomChildrenRes<A>) => boolean;
    onClick?: (opt: CustomChildrenRes<A>) => void;
}

export const registry = pluginRegistry<ResourceAction>(MODULE_NAME);

export function registerResourceAction<P, A extends Attributes>(
    compId: string,
    action: ResourceAction<P, A>
) {
    registry.register(compId, action as unknown as ResourceAction);
}
