import type React from "react";

import { Modal } from "@nextgisweb/gui/antd";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";

import "./PreviewMapModal.less";

export type PreviewMapModalProps = ShowModalOptions & {
    children?: React.ReactNode;
};

export function PreviewMapModal({
    open,
    children,
    close,
    ...props
}: PreviewMapModalProps) {
    return (
        <Modal
            className="map-preview-modal"
            open={open}
            {...props}
            onCancel={close}
            closeIcon={false}
            footer={null}
            width={"60vw"}
            height={"60vh"}
        >
            {children}
        </Modal>
    );
}
