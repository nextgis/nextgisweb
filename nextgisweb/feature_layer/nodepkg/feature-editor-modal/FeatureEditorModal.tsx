import { useCallback, useEffect, useState } from "react";

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
const [msgConfirmTitle, msgConfirmContent] = [
    gettext("Are you sure?"),
    gettext("Unsaved changes will be lost if you close the window."),
];

export function FeatureEditorModal({
    open: openProp,
    editorOptions,
    onCancel,
    ...modalProps
}: FeatureEditorModalProps) {
    const [open, setOpen] = useState(openProp);
    const { resourceId, featureId, onSave, mode, onOk } = editorOptions || {};
    const [modal, contextHolder] = Modal.useModal();

    if (typeof resourceId !== "number") {
        throw new Error("The `editorOptions.resourceId` is reuqired");
    }
    const [store] = useState(
        () =>
            new FeatureEditorStore({
                resourceId,
                featureId: typeof featureId === "number" ? featureId : null,
            })
    );

    const close = () => {
        setOpen(false);
    };

    const handleClose = useCallback(
        (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            const close_ = () => {
                onCancel?.(e);
                close();
            };

            if (store.dirty) {
                modal.confirm({
                    title: msgConfirmTitle,
                    content: msgConfirmContent,
                    onOk: close_,
                });
            } else {
                close_();
            }
        },
        [modal, onCancel, store.dirty]
    );

    useEffect(() => {
        setOpen(openProp);
    }, [openProp]);

    return (
        <>
            <Modal
                className="ngw-feature-layer-feature-editor-modal"
                width="" // Do not set the default (520px) width
                centered={true}
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
                    mode={mode}
                    onSave={(e) => {
                        close();
                        onSave?.(e);
                    }}
                    onOk={(e) => {
                        close();
                        onOk?.(e);
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
