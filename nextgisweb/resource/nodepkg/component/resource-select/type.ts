import type { Select } from "@nextgisweb/gui/antd";

import type {
    ResourcePickerStoreOptions,
    SelectValue,
} from "../resource-picker/type";

export type SelectProps = Parameters<typeof Select>[0];

export interface ResourceSelectProps<V extends SelectValue = SelectValue>
    extends Omit<SelectProps, "onChange"> {
    value?: V;
    readOnly?: boolean;
    pickerOptions?: ResourcePickerStoreOptions;
    onChange?: (val: V | undefined) => void;
}
