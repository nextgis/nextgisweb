import { Button, Modal, Progress, Col, Row } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!gui";

const defTitleMsg = i18n.gettext("Operation in progress");
const defCancelMsg = i18n.gettext("Cancel");

export const ProgressModal = ({
    status = "active",
    type = "line",
    percent = 0,
    visible = true,
    closable = false,
    okText = null,
    onCancel = null,
    title = defTitleMsg,
    cancelText = defCancelMsg,
    close,
    ...restProps
}) => {
    const modalOptions = { visible, closable, title, okText, onCancel };
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
