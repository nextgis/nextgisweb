/** @entrypoint */
import showModal from "@nextgisweb/gui/showModal";

import { FeatureEditorModal } from "./FeatureEditorModal";
import type { FeatureEditorModalProps } from "./FeatureEditorModal";

const showFeatureEditorModal = (props: FeatureEditorModalProps) => {
    showModal(FeatureEditorModal, props);
};

export { FeatureEditorModal, showFeatureEditorModal };
