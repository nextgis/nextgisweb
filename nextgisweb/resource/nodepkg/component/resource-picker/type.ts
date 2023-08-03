import type { ParamsOf } from "@nextgisweb/gui/type";
import type { Card, Modal, Table } from "@nextgisweb/gui/antd";
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

export interface ResourcePickerChildrenProps {
    resourceStore: ResourcePickerStore;
    onOk?: (val: number | number[]) => void;
}

export interface ResourcePickerFooterProps {
    resourceStore: ResourcePickerStore;
    onOk?: (val: SelectValue) => void;
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

export interface ResourcePickerCardProps {
    pickerOptions?: ResourcePickerStoreOptions;
    cardOptions?: CardProps;
    showClose?: boolean;
    onSelect?: (res: SelectValue) => void;
    onClose?: () => void;
    store?: ResourcePickerStore;
}

export interface UsePickerModalProps {
    cardOptions?: CardProps;
    height?: number;
    cardTitleHeight?: number;
    cardFooterHeight?: number;
}

export interface ResourcePickerModalProps extends UsePickerModalProps {
    open?: boolean;
    /**@deprecated use open instead */
    visible?: boolean;
    store?: ResourcePickerStore;
    onSelect?: (val: SelectValue) => void;
    closeOnSelect?: boolean;
    pickerOptions?: ResourcePickerStoreOptions;
}
