import showModal from "@nextgisweb/gui/showModal";

import { FinishEditingModal } from "./FinishEditingDialog";
import type { FinishEditingModalProps } from "./FinishEditingDialog";

export function showFinishEditingDialog(options: FinishEditingModalProps) {
    return showModal(FinishEditingModal, options);
}
