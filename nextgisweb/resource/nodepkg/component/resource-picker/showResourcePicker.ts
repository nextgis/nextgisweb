import showModal from "@nextgisweb/gui/showModal";

import { ResourcePickerModal } from "./ResourcePickerModal";
import type { ResourcePickerModalProps, SelectValue } from "./type";

export function showResourcePicker<V extends SelectValue = SelectValue>(
    params: ResourcePickerModalProps<V>
) {
    return showModal(ResourcePickerModal, {
        ...params,
    });
}
