import { Button, Col, Modal, Progress, Row } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ParamsOf } from "@nextgisweb/gui/type";

const defTitleMsg = gettext("Operation in progress");
const defCancelMsg = gettext("Cancel");

type ProgressModal = ParamsOf<typeof Progress>;

type ModalParams = ParamsOf<typeof Modal>;
type ModalParamsForProgress = Pick<
    ModalParams,
    "open" | "visible" | "closable" | "title" | "okText" | "onCancel"
>;

export type ProgressModalProps = ModalParamsForProgress &
    ProgressModal & { cancelText?: string };

export const ProgressModal = ({
    status = "active",
    type = "line",
    percent = 0,
    open = true,
    visible = true,
    closable = false,
    okText = null,
    onCancel,
    title = defTitleMsg,
    cancelText = defCancelMsg,
    ...restProps
}: ProgressModalProps) => {
    const modalOptions: ModalParams & Pick<ModalParams, "footer"> = {
        open: open ?? visible,
        title,
        okText,
        visible,
        closable,
        onCancel,
    };
    if (onCancel) {
        modalOptions.footer = (
            <Row justify="space-between">
                <Col></Col>
                <Col>
                    <Button onClick={onCancel}>{cancelText}</Button>
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
