import { useEffect, useState } from "react";

import { Button, Modal } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { FeatureEditorStore } from "../feature-editor/FeatureEditorStore";
import { FeatureEditorWidget } from "../feature-editor/FeatureEditorWidget";
import type { FeatureEditorWidgetProps } from "../feature-editor/type";

import "./FeatureEditorModal.less";

export type ModalProps = Parameters<typeof Modal>[0];

export interface FeatureEditorModalProps extends ModalProps {
    editorOptions?: FeatureEditorWidgetProps;
}

const msgCancel = gettext("Cancel");
const msgConfirmTitle = gettext("Are you sure?");
const msgConfirmContent = gettext(
    "Unsaved changes will be lost if you close the window."
);

export function FeatureEditorModal({
    open: open_,
    editorOptions,
    ...modalProps
}: FeatureEditorModalProps) {
    const [open, setOpen] = useState(open_);
    const { resourceId, featureId, onSave } = editorOptions || {};
    const [modal, contextHolder] = Modal.useModal();

    if (!resourceId || !featureId) {
        throw new Error(
            "The `editorOptions.resourceId` and `editorOptions.featureId` are reuqired"
        );
    }
    const [store] = useState(
        () => new FeatureEditorStore({ resourceId, featureId })
    );

    const close = () => {
        setOpen(false);
    };

    const handleClose = () => {
        if (store.dirty) {
            modal.confirm({
                title: msgConfirmTitle,
                content: msgConfirmContent,
                onOk: close,
                onCancel: () => {},
            });
        } else {
            close();
        }
    };

    useEffect(() => {
        setOpen(open_);
    }, [open_]);

    return (
        <>
            <Modal
                className="ngw-feature-layer-feature-editor-modal"
                width="" // Do not set the default (520px) width
                open={open}
                destroyOnClose
                footer={null}
                closable={false}
                onCancel={handleClose}
                {...modalProps}
            >
                <FeatureEditorWidget
                    resourceId={resourceId}
                    featureId={featureId}
                    store={store}
                    onSave={(e) => {
                        close();
                        if (onSave) {
                            onSave(e);
                        }
                    }}
                    toolbar={{
                        rightActions: [
                            <Button key="reset" onClick={handleClose}>
                                {msgCancel}
                            </Button>,
                        ],
                    }}
                />
            </Modal>
            {contextHolder}
        </>
    );
}
