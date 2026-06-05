import classNames from "classnames";
import type { PropsWithChildren } from "react";

import { Modal } from "@nextgisweb/gui/antd";

import "./EditorModal.less";

export type ModalProps = Parameters<typeof Modal>[0];

export function EditorModal({
  children,
  className,
  centered = true,
  destroyOnHidden = true,
  footer = null,
  width = "", // Do not set the default (520px) width
  ...props
}: PropsWithChildren<ModalProps>) {
  return (
    <Modal
      className={classNames("ngw-editor-modal", className)}
      width={width}
      centered={centered}
      destroyOnHidden={destroyOnHidden}
      footer={footer}
      focusable={{
        trap: false,
        focusTriggerAfterClose: false,
      }}
      {...props}
    >
      {children}
    </Modal>
  );
}
