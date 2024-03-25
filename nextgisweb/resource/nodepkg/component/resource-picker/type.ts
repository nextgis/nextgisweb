import type { Card, Modal, Table } from "@nextgisweb/gui/antd";
import type { ParamsOf } from "@nextgisweb/gui/type";
import type {
    CompositeRead,
    ResourceCls,
    ResourceRead,
} from "@nextgisweb/resource/type/api";

import type { ResourceInterface } from "../../type/Resource";

import type { ResourcePickerStore } from "./store/ResourcePickerStore";

export type SelectValue = number | number[];

export type CardProps = Parameters<typeof Card>[0];
export type ModalProps = Parameters<typeof Modal>[0];

export type TableProps = ParamsOf<typeof Table>;
export type RowSelection = Exclude<TableProps["rowSelection"], undefined>;
export type RowSelectionType = RowSelection["type"];

export type PickerResource = ResourceRead;

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

export type OnNewGroupType = (resource: CompositeRead) => void;

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
    requireClass?: ResourceCls | null;
    getThisMsg?: string;
    onNewGroup?: null | OnNewGroupType;
    disableResourceIds?: number[];
    getSelectedMsg?: string;
    requireInterface?: ResourceInterface | null;
    traverseClasses?: ResourceCls[] | null;
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
    onPick?: (val: CompositeRead | CompositeRead[]) => void;
    closeOnSelect?: boolean;
    pickerOptions?: ResourcePickerStoreOptions;
}
