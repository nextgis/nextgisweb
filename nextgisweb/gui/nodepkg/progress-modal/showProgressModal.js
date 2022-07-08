import { ProgressModal } from "./ProgressModal";
import showModal from "@nextgisweb/gui/showModal";


export function showProgressModal(props) {
    const progressModal = showModal(ProgressModal, props);

    return {
        modal: progressModal,
        close: () => {
            progressModal.close();
        },
        update: (newProps) => {
            progressModal.update(newProps);
        },
        setPercent: (percent) => {
            progressModal.update({percent});
        },
    };
}
