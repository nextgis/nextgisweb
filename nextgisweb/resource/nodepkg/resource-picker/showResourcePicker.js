import showModal from "@nextgisweb/gui/showModal";
import { ResourcePickerModal } from "./ResourcePickerModal";

export function showResourcePicker(params) {
    return showModal(ResourcePickerModal, {
        ...params,
        bodyStyle: { height: '400px' },
    });
}
