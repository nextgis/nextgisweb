import { useTransition } from "react";

import { Button, Modal, Space } from "@nextgisweb/gui/antd";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";

export interface FinishEditingModalProps extends ShowModalOptions {
    onSave?: () => void;
    onUndo?: () => void;
    onContinue?: () => void;
}

export default function FinishEditingModal({
    close,
    onSave,
    onUndo,
    onCancel,
    onContinue,
    ...rest
}: FinishEditingModalProps) {
    const [isSaving, startTransition] = useTransition();

    const onSaveClick = () => {
        startTransition(() => {
            onSave?.();
            close?.();
        });
    };

    return (
        <Modal
            title={gettext("Stop editing")}
            width={400}
            open={true}
            footer={null}
            centered
            destroyOnHidden
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
                            loading={isSaving}
                            onClick={onSaveClick}
                        >
                            {gettext("Save")}
                        </Button>
                    </Space>
                </div>
            </div>
        </Modal>
    );
}
