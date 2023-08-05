import { Modal, message } from "@nextgisweb/gui/antd";

import i18n from "@nextgisweb/pyramid/i18n";

import type { ModalFuncProps } from "antd/lib/modal/Modal";

interface ConfirmOptions extends ModalFuncProps {
    errorMessage?: string;
}

export function confirm({
    onOk,
    errorMessage,
    title = i18n.gettext("Confirmation required"),
    content = i18n.gettext("Please confirm this action."),
    okButtonProps = { danger: true, type: "primary" },
    okText = i18n.gettext("OK"),
    autoFocusButton = "cancel",
}: ConfirmOptions) {
    Modal.confirm({
        onOk: async () => {
            if (onOk) {
                try {
                    await onOk();
                } catch (er) {
                    const isUserAbort =
                        er && (er as Error).name === "AbortError";
                    if (errorMessage && !isUserAbort) {
                        message.error(errorMessage);
                    }
                    throw er;
                }
            }
        },
        title,
        content,
        okButtonProps,
        okText,
        autoFocusButton,
    });
}

export function confirmDelete({
    content = i18n.gettext("Please confirm the deletion."),
    okText = i18n.gettext("Delete"),
    errorMessage = i18n.gettext("Failed to delete."),
    ...rest
}) {
    confirm({ content, okText, errorMessage, ...rest });
}
