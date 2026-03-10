import type { ResourceAttrItem } from "@nextgisweb/resource/api/ResourceAttrItem";
import type { Attributes } from "@nextgisweb/resource/api/resource-attr";
import type { ResourceAction } from "@nextgisweb/resource/resource-section/registry";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import type {
  DefaultResourceAttrItem,
  DefaultResourceSectionAttrs,
} from "../type";

import type { ActionBtnProps } from "./component/ActionBtn";

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

export type RenderResourceAction = ResourceAction<ActionBtnProps>;

export interface RenderActionsProps {
  record: ChildrenResource;
  attributes: [...typeof DefaultResourceSectionAttrs];
  setAttrItems: React.Dispatch<React.SetStateAction<DefaultResourceAttrItem[]>>;
}
