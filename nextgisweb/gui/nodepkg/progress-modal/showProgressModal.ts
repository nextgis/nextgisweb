import showModal from "@nextgisweb/gui/showModal";

import { ProgressModal } from "./ProgressModal";
import type { ProgressModalProps } from "./ProgressModal";

export function showProgressModal(props: ProgressModalProps) {
    const progressModal = showModal(ProgressModal, props);

    return {
        modal: progressModal,
        close: () => {
            progressModal.close();
        },
        update: (newProps: ProgressModalProps) => {
            progressModal.update(newProps);
        },
        setPercent: (percent: number) => {
            progressModal.update({ percent });
        },
    };
}
