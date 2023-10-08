import type { ModalFuncProps } from "antd/lib/modal/interface";

import { Modal, message } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

interface ConfirmOptions extends ModalFuncProps {
    errorMessage?: string;
}

export function confirm({
    onOk,
    errorMessage,
    title = gettext("Confirmation required"),
    content = gettext("Please confirm this action."),
    okButtonProps = { danger: true, type: "primary" },
    okText = gettext("OK"),
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
    content = gettext("Please confirm the deletion."),
    okText = gettext("Delete"),
    errorMessage = gettext("Failed to delete."),
    ...rest
}) {
    confirm({ content, okText, errorMessage, ...rest });
}
