import type { ReactNode } from "react";

import { Modal } from "@nextgisweb/gui/antd";
import type { ModalProps } from "@nextgisweb/gui/antd";

import "./PreviewMapModal.less";

export interface PreviewMapModalProps extends ModalProps {
  children?: ReactNode;
}

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
