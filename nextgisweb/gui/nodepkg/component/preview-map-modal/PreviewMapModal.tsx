import type React from "react";

import { Modal } from "@nextgisweb/gui/antd";
import type { ParamsOf } from "@nextgisweb/gui/type";
import "./PreviewMapModal.less";

export type PreviewMapModalProps = ParamsOf<typeof Modal> & {
    children?: React.ReactNode;
};

export function PreviewMapModal({
    children,
    onCancel,
    ...props
}: PreviewMapModalProps) {
    return (
        <Modal
            className="map-preview-modal"
            {...props}
            onCancel={onCancel}
            closeIcon={false}
            footer={null}
            width={"60vw"}
            height={"60vh"}
        >
            {children}
        </Modal>
    );
}
