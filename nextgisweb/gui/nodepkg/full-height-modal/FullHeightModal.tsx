import classNames from "classnames";

import { Modal } from "@nextgisweb/gui/antd";
import type { ModalProps } from "@nextgisweb/gui/antd";

import "./FullHeightModal.less";

export type FullHeightModalProps = ModalProps;

export function FullHeightModal({
  className,
  width = "", // Do not set the default (520px) width
  centered = true,
  footer = null,

  ...props
}: FullHeightModalProps) {
  return (
    <Modal
      className={classNames("ngw-full-height-modal", className)}
      width={width}
      centered={centered}
      footer={footer}
      {...props}
    />
  );
}
