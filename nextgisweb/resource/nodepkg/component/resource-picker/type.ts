import type { Card, Modal } from "@nextgisweb/gui/antd";

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

export interface FormattedResource extends Resource {
    displayName: string;
    hasChildren: boolean;
}

export interface ResourcePickerBreadcrumbProps {
    resourceStore: ResourcePickerStore;
    maxBreadcrumbItems?: number;
}

export interface ResourcePickerChildrenProps {
    resourceStore: ResourcePickerStore;
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
    visible?: boolean;
    store?: ResourcePickerStore;
    onSelect?: (val: SelectValue) => void;
    closeOnSelect?: boolean;
    pickerOptions?: ResourcePickerStoreOptions;
}
