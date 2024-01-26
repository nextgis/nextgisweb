import { Button, Col, Modal, Progress, Row } from "@nextgisweb/gui/antd";
import type { ParamsOf } from "@nextgisweb/gui/type";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgInProgress = gettext("Operation in progress");
const msgCancel = gettext("Cancel");

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
    title = msgInProgress,
    cancelText = msgCancel,
    ...restProps
}: ProgressModalProps) => {
    const modalOptions: ModalParams & Pick<ModalParams, "footer"> = {
        open: open ?? visible,
        title,
        okText,
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
