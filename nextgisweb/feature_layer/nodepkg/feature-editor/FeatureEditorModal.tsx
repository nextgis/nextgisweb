import { Button, Modal } from "@nextgisweb/gui/antd";
import { useEffect, useState } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";

import { FeatureEditorWidget } from "./FeatureEditorWidget";

import type { FeatureEditorWidgetProps } from "./type";

import "./FeatureEditorModal.less";

export type ModalProps = Parameters<typeof Modal>[0];

interface FeatureEditorModalProps extends ModalProps {
    editorOptions?: FeatureEditorWidgetProps;
}

const msgCancel = gettext("Cancel");

export function FeatureEditorModal({
    open: open_,
    editorOptions,
    ...modalProps
}: FeatureEditorModalProps) {
    const [open, setOpen] = useState(open_);

    const { resourceId, featureId, onSave } = editorOptions || {};

    if (!resourceId || !featureId) {
        throw new Error(
            "The `editorOptions.resourceId` and `editorOptions.featureId` are reuqired"
        );
    }

    const close = () => setOpen(false);

    useEffect(() => {
        setOpen(open_);
    }, [open_]);

    return (
        <Modal
            className="resource-picker-modal"
            open={open}
            destroyOnClose
            footer={null}
            closable={false}
            onCancel={close}
            {...modalProps}
        >
            <FeatureEditorWidget
                resourceId={resourceId}
                featureId={featureId}
                onSave={(e) => {
                    close();
                    if (onSave) {
                        onSave(e);
                    }
                }}
                toolbar={{
                    rightActions: [
                        <Button key="reset" onClick={close}>
                            {msgCancel}
                        </Button>,
                    ],
                }}
            />
        </Modal>
    );
}
