import showModal from "@nextgisweb/gui/showModal";
import { ResourcePickerModal } from "./ResourcePickerModal";

import type { ResourcePickerModalProps } from "./type";

export function showResourcePicker(params: ResourcePickerModalProps) {
    return showModal(ResourcePickerModal, {
        ...params,
    });
}
