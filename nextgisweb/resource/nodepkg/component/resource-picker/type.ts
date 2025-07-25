import type { CardProps, TableRowSelection } from "@nextgisweb/gui/antd";
import type { ModalStore } from "@nextgisweb/gui/show-modal/ModalStore";
import type {
    CompositeRead,
    ResourceCls,
    ResourceInterface,
    ResourceRead,
} from "@nextgisweb/resource/type/api";

import type { ResourcePickerStore } from "./store/ResourcePickerStore";

export type SelectValue = number | number[];

export type RowSelection = TableRowSelection<PickerResource>;
export type RowSelectionType = RowSelection["type"];

export type PickerResource = ResourceRead;

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

export type OnNewGroupType = (resource: CompositeRead) => void;

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

export interface ResourcePickerModalProps<V extends SelectValue = SelectValue>
    extends UsePickerModalProps {
    open?: boolean;
    modalStore?: ModalStore;
    store?: ResourcePickerStore;
    onSelect?: (val: V) => void;
    onPick?: (val: CompositeRead | CompositeRead[]) => void;
    closeOnSelect?: boolean;
    pickerOptions?: ResourcePickerStoreOptions;
}
