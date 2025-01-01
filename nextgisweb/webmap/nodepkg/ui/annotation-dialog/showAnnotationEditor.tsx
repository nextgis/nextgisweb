import showModal from "@nextgisweb/gui/showModal";

import { AnnotationsModal } from "./AnnotationsModal";
import type { AnnotationsModalProps } from "./AnnotationsModal";

export function showAnnotationEditor(options: AnnotationsModalProps) {
    return showModal(AnnotationsModal, options);
}
