import { Button, Modal, Space } from "@nextgisweb/gui/antd";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";

export interface FinishEditingModalProps extends ShowModalOptions {
    onSave?: () => void;
    onUndo?: () => void;
    onContinue?: () => void;
}

export function FinishEditingModal({
    close,
    onSave,
    onUndo,
    onCancel,
    onContinue,
    ...rest
}: FinishEditingModalProps) {
    return (
        <Modal
            title={gettext("Stopping editing")}
            width={400}
            open={true}
            footer={null}
            centered
            destroyOnClose
            {...rest}
        >
            <div>
                <p>{gettext("Do you want to save changes?")}</p>

                <div style={{ marginTop: 24, textAlign: "right" }}>
                    <Space>
                        <Button
                            onClick={() => {
                                onUndo?.();
                                close?.();
                            }}
                        >
                            {gettext("Don't save")}
                        </Button>
                        <Button
                            onClick={() => {
                                onContinue?.();
                                close?.();
                            }}
                        >
                            {gettext("Cancel")}
                        </Button>
                        <Button
                            type="primary"
                            onClick={() => {
                                onSave?.();
                                close?.();
                            }}
                        >
                            {gettext("Save")}
                        </Button>
                    </Space>
                </div>
            </div>
        </Modal>
    );
}
