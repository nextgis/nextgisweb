import showModal from "@nextgisweb/gui/showModal";
import { ResourcePickerModal } from "./resource-picker-modal";

export function showResourcePicker(params) {
    return showModal(ResourcePickerModal, {
        ...params,
        bodyStyle: { height: '400px' },
    });
}
