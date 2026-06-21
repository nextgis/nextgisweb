import { Button, Col, Modal, Progress, Row } from "@nextgisweb/gui/antd";
import type { ModalProps, ProgressProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ShowModalOptions } from "../show-modal/showModalBase";

const msgInProgress = gettext("Operation in progress");
const msgCancel = gettext("Cancel");

export interface ProgressModalProps
  extends
    Pick<
      ShowModalOptions,
      | "open"
      | "closable"
      | "close"
      | "afterClose"
      | "title"
      | "okText"
      | "onCancel"
    >,
    Omit<ProgressProps, keyof ShowModalOptions> {
  cancelText?: string;
}

export const ProgressModal = ({
  status = "active",
  type = "line",
  percent = 0,
  open = true,
  closable = false,
  okText = null,
  afterClose,
  onCancel,
  close,
  title = msgInProgress,
  cancelText = msgCancel,
  ...restProps
}: ProgressModalProps) => {
  const modalOptions: ShowModalOptions & Pick<ShowModalOptions, "footer"> = {
    open,
    title,
    okText,
    closable,
    afterClose,
    onCancel,
    close,
  };
  if (onCancel) {
    modalOptions.footer = (
      <Row justify="space-between">
        <Col></Col>
        <Col>
          <Button
            onClick={(e) =>
              onCancel(e as Parameters<NonNullable<ModalProps["onCancel"]>>[0])
            }
          >
            {cancelText}
          </Button>
        </Col>
      </Row>
    );
  } else {
    modalOptions.footer = null;
  }

  const progressProps = {
    type,
    status,
    percent,
    ...restProps,
  };

  return (
    <Modal {...modalOptions}>
      <Progress {...progressProps} />
    </Modal>
  );
};
