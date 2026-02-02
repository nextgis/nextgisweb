/** @registry */
import type { FC } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { ResourceAttrItem } from "@nextgisweb/resource/api/ResourceAttrItem";
import type { Attributes } from "@nextgisweb/resource/api/resource-attr";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

type CustomResAttrItem<A extends Attributes = Attributes> = {
    item: ResourceAttrItem<[...A]>;
    children?: React.ReactNode;
};

export type ResourceActionWidgetProps<
    P = unknown,
    A extends Attributes = Attributes,
> = P & CustomResAttrItem<A>;

export type ResourceIconWidget<
    P = unknown,
    A extends Attributes = Attributes,
> = FC<ResourceActionWidgetProps<P, A>>;

export interface ResourceIconRegItem<
    P = unknown,
    A extends Attributes = Attributes,
> {
    cls: ResourceCls;
    icon?: ResourceIconWidget<P>;
    props?: P;
    attributes?: [...A];
}

export const registry = pluginRegistry<ResourceIconRegItem>(MODULE_NAME);

export function registerResourceIcon<P, A extends Attributes>(
    compId: string,
    action: ResourceIconRegItem<P, A>
) {
    registry.register(compId, action as unknown as ResourceIconRegItem);
}
