import { Modal, message } from "@nextgisweb/gui/antd";

import i18n from "@nextgisweb/pyramid/i18n";

export function confirm({
    onOk,
    errorMessage,
    title = i18n.gettext("Confirmation required"),
    content = i18n.gettext("Please confirm this action."),
    okButtonProps = { danger: true, type: "primary" },
    okText = i18n.gettext("OK"),
    autoFocusButton = "cancel",
}) {
    Modal.confirm({
        onOk: async () => {
            try {
                await onOk();
            } catch (er) {
                const isUserAbort = er && er.name === "AbortError";
                if (errorMessage && !isUserAbort) {
                    message.error(errorMessage);
                }
                throw er;
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
