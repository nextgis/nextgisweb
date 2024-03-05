import type { Card, Modal, Table } from "@nextgisweb/gui/antd";
import type { ParamsOf } from "@nextgisweb/gui/type";

import type {
    Resource,
    ResourceClass,
    ResourceInterface,
    ResourceItem,
    ResourcePermission,
} from "../../type/Resource";

import type { ResourcePickerStore } from "./store/ResourcePickerStore";

export type SelectValue = number | number[];

export type CardProps = Parameters<typeof Card>[0];
export type ModalProps = Parameters<typeof Modal>[0];

export type TableProps = ParamsOf<typeof Table>;
export type RowSelection = Exclude<TableProps["rowSelection"], undefined>;
export type RowSelectionType = RowSelection["type"];

export type PickerResource = Resource;

export interface ResourcePickerBreadcrumbProps {
    resourceStore: ResourcePickerStore;
    maxBreadcrumbItems?: number;
}

export interface ResourcePickerChildrenProps<
    V extends SelectValue = SelectValue,
> {
    resourceStore: ResourcePickerStore;
    onOk?: (val: V) => void;
}

export interface ResourcePickerFooterProps<
    V extends SelectValue = SelectValue,
> {
    resourceStore: ResourcePickerStore;
    onOk?: (val: V) => void;
}

export type OnNewGroupType = (resource: ResourceItem) => void;

export interface ResourcePickerTitleProps {
    resourceStore: ResourcePickerStore;
    onClose?: () => void;
    showClose?: boolean;
}

export interface ResourcePickerStoreOptions {
    multiple?: boolean;
    parentId?: number;
    saveLastParentIdGlobal?: boolean;
    selected?: number[];
    requireClass?: ResourceClass | null;
    getThisMsg?: string;
    onNewGroup?: null | OnNewGroupType;
    disableResourceIds?: number[];
    getSelectedMsg?: string;
    requireInterface?: ResourceInterface | null;
    traverseClasses?: ResourceClass[] | null;
    requirePermission?: ResourcePermission | null;
    hideUnavailable?: boolean;
    onTraverse?: (parentId: number) => void;
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

export interface ResourcePickerModalProps<V extends SelectValue = SelectValue>
    extends UsePickerModalProps {
    open?: boolean;
    /**@deprecated use open instead */
    visible?: boolean;
    store?: ResourcePickerStore;
    onSelect?: (val: V) => void;
    onPick?: (val: ResourceItem | ResourceItem[]) => void;
    closeOnSelect?: boolean;
    pickerOptions?: ResourcePickerStoreOptions;
}
