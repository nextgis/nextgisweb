import type { Ref } from "react";

import { Button, Modal } from "@nextgisweb/gui/antd";
import type { ModalProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgTitle = gettext("Panorama");
const msgClose = gettext("Close");

interface PanoramaModalProps extends Omit<ModalProps, "onCancel" | "footer"> {
  iframeRef: Ref<HTMLIFrameElement>;
  contentHeight?: number | string;
  onClose?: () => void;
}

export function PanoramaModal({
  open,
  iframeRef,
  title = msgTitle,
  contentHeight = 600,
  width = 1200,
  onClose,
  ...props
}: PanoramaModalProps) {
  return (
    <Modal
      {...props}
      forceRender
      title={title}
      width={width}
      centered={true}
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>{msgClose}</Button>}
    >
      <div style={{ height: contentHeight }}>
        <iframe
          ref={iframeRef}
          src="/panorama/"
          style={{
            width: open ? "100%" : 0,
            height: open ? "100%" : 0,
            border: "none",
          }}
        />
      </div>
    </Modal>
  );
}
