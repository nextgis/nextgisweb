import type { CardProps, TableRowSelection } from "@nextgisweb/gui/antd";
import type { ModalStore } from "@nextgisweb/gui/show-modal/ModalStore";
import type { ResourceAttrItem } from "@nextgisweb/resource/api/ResourceAttrItem";
import type { Attributes } from "@nextgisweb/resource/api/resource-attr";
import type {
    ResourceCls,
    ResourceInterface,
} from "@nextgisweb/resource/type/api";

import type { ResourcePickerStore } from "./store/ResourcePickerStore";

export const ResourcePickerDefaultAttrs = [
    ["resource.cls"],
    ["resource.parent"],
    ["resource.keyname"],
    ["resource.children"],
    ["resource.interfaces"],
    ["resource.owner_user"],
    ["resource.display_name"],
    ["resource.creation_date"],
    ["layer_preview.available"],
    ["resource.has_permission", "data.read"],
] as const satisfies Attributes;

export type ResourcePickerAttr = ResourceAttrItem<
    typeof ResourcePickerDefaultAttrs
>;

export type SelectValue = number | number[];

export type RowSelection = TableRowSelection<PickerResource>;
export type RowSelectionType = RowSelection["type"];

export type PickerResource = ResourcePickerAttr;

export interface ResourcePickerBreadcrumbProps {
    store: ResourcePickerStore;
    maxBreadcrumbItems?: number;
}

export interface ResourcePickerChildrenProps<
    V extends SelectValue = SelectValue,
> {
    store: ResourcePickerStore;
    onOk?: (val: V) => void;
}

export interface ResourcePickerFooterProps<
    V extends SelectValue = SelectValue,
> {
    store: ResourcePickerStore;
    onOk?: (val: V) => void;
}

export type OnNewGroupType = (resource: ResourcePickerAttr) => void;

export interface ResourcePickerTitleProps {
    store: ResourcePickerStore;
    onClose?: () => void;
    showClose?: boolean;
}

export interface ResourcePickerStoreOptions {
    multiple?: boolean;
    parentId?: number;
    initParentId?: number | null;
    saveLastParentIdGlobal?: boolean;
    selected?: number[];
    requireClass?: ResourceCls | ResourceCls[] | null;
    getThisMsg?: string;
    onNewGroup?: null | OnNewGroupType;
    disableResourceIds?: number[];
    getSelectedMsg?: string;
    requireInterface?: ResourceInterface | ResourceInterface[] | null;
    traverseClasses?: ResourceCls[] | null;
    hideUnavailable?: boolean;
    onTraverse?: ((parentId: number) => void) | null;
}

export interface ResourcePickerCardProps<V extends SelectValue = SelectValue> {
    pickerOptions?: ResourcePickerStoreOptions;
    cardOptions?: CardProps;
    showClose?: boolean;
    onSelect?: (res: V) => void;
    onClose?: () => void;
    store?: ResourcePickerStore;
}

export interface UsePickerModalProps {
    cardOptions?: CardProps;
    height?: number;
    cardTitleHeight?: number;
    cardFooterHeight?: number;
}

export interface ResourcePickerModalProps<
    V extends SelectValue = SelectValue,
> extends UsePickerModalProps {
    open?: boolean;
    modalStore?: ModalStore;
    store?: ResourcePickerStore;
    onSelect?: (val: V) => void;
    onPick?: (val: ResourcePickerAttr | ResourcePickerAttr[]) => void;
    closeOnSelect?: boolean;
    pickerOptions?: ResourcePickerStoreOptions;
}
