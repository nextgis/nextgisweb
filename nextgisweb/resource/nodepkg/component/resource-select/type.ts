import type { SelectProps } from "@nextgisweb/gui/antd";

import type {
    ResourcePickerStoreOptions,
    SelectValue,
} from "../resource-picker/type";

export interface ResourceSelectProps<V extends SelectValue = SelectValue>
    extends Omit<SelectProps<V, never>, "onChange" | "options"> {
    value?: V;
    readOnly?: boolean;
    pickerOptions?: ResourcePickerStoreOptions;
    onChange?: (val: V | undefined) => void;
}
