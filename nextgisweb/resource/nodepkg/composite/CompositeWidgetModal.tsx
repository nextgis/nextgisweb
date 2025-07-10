import { useCallback, useEffect, useMemo, useState } from "react";

import type { ActionToolbarAction } from "@nextgisweb/gui/action-toolbar";
import { Grid, Modal } from "@nextgisweb/gui/antd";
import type { ModalProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { CompositeStore } from "./CompositeStore";
import type { CompositeStoreOptions } from "./CompositeStore";
import CompositeWidget from "./CompositeWidget";

export interface CompositeWidgetModalProps extends ModalProps {
    compositeProps: CompositeStoreOptions;
    onSubmit?: (val: { id: number }) => void;
}
const { useBreakpoint } = Grid;

const [msgConfirmTitle, msgConfirmContent] = [
    gettext("Are you sure?"),
    gettext("Unsaved changes will be lost if you close the window."),
];

function CompositeWidgetModal({
    open: openProp,
    compositeProps,
    onCancel,
    onSubmit,
    ...modalProps
}: CompositeWidgetModalProps) {
    const [open, setOpen] = useState(openProp);
    const [modal, contextHolder] = Modal.useModal();
    const [store] = useState(() => new CompositeStore(compositeProps));

    const screens = useBreakpoint(); // { xs: true, sm: true, md: false, … }
    const isMobile = !screens.md; // md ≈ 768 px

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

    const rightActions = useMemo<ActionToolbarAction[]>(() => {
        const actions: ActionToolbarAction[] = [
            { title: gettext("Close"), onClick: handleClose },
        ];
        return actions;
    }, [handleClose]);

    return (
        <>
            {contextHolder}
            <Modal
                className="ngw-resource-composite-widget-modal"
                width={isMobile ? "100%" : "70%"}
                styles={{
                    wrapper: { maxWidth: "1500px", margin: "0 auto" },
                    body: {
                        height: isMobile ? "100vh" : "70vh",
                        overflow: "auto",
                    },
                }}
                centered={true}
                open={open}
                destroyOnHidden
                footer={null}
                closable={false}
                onCancel={handleClose}
                {...modalProps}
            >
                <CompositeWidget
                    store={store}
                    onSubmit={onSubmit}
                    rightActions={rightActions}
                />
            </Modal>
        </>
    );
}

export default CompositeWidgetModal;
