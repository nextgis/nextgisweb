import type { ReactNode } from "react";

import type { SelectProps } from "@nextgisweb/gui/antd";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import type {
    ResourcePickerStoreOptions,
    SelectValue,
} from "../resource-picker/type";

export interface ResourceSelectOption {
    label: ReactNode;
    value: number;
    cls: ResourceCls;
}

export interface ResourceSelectProps<V extends SelectValue = SelectValue>
    extends Omit<
        SelectProps<V, ResourceSelectOption>,
        "onChange" | "options" | "multiple"
    > {
    value?: V;
    readOnly?: boolean;
    hideGoto?: boolean;
    pickerOptions?: ResourcePickerStoreOptions;
    onChange?: (val: V | undefined) => void;
    // We use different components for singular and multiple
    multiple?: never;
}
