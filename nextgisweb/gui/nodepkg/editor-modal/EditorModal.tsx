import classNames from "classnames";
import type { PropsWithChildren } from "react";

import { Modal } from "@nextgisweb/gui/antd";

import "./EditorModal.less";

export type ModalProps = Parameters<typeof Modal>[0];

export interface EditorModalShellProps extends ModalProps {
  modalClassName?: string;
}

export function EditorModal({
  children,
  className,
  modalClassName,
  centered = true,
  destroyOnHidden = true,
  footer = null,
  width = "", // Do not set the default (520px) width
  ...props
}: PropsWithChildren<EditorModalShellProps>) {
  return (
    <Modal
      className={classNames("ngw-editor-modal", modalClassName, className)}
      width={width}
      centered={centered}
      destroyOnHidden={destroyOnHidden}
      footer={footer}
      {...props}
    >
      {children}
    </Modal>
  );
}
