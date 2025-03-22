import { Modal, message } from "@nextgisweb/gui/antd";
import type { ModalFuncProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { isAbortError } from "./error";

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
                } catch (err) {
                    if (errorMessage && !isAbortError(err)) {
                        message.error(errorMessage);
                    }
                    throw err;
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
