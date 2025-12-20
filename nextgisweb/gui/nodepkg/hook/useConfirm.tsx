import { useCallback } from "react";

import { Modal, message } from "@nextgisweb/gui/antd";
import type { ModalFuncProps } from "@nextgisweb/gui/antd";
import { isAbortError } from "@nextgisweb/gui/error";
import { gettext } from "@nextgisweb/pyramid/i18n";

interface ConfirmOptions extends ModalFuncProps {
    errorMessage?: string;
}

export function useConfirm() {
    const [modal, modalContextHolder] = Modal.useModal();
    const [messageApi, messageContextHolder] = message.useMessage();

    const confirm = useCallback(
        ({
            onOk,
            errorMessage,
            title = gettext("Confirmation required"),
            content = gettext("Please confirm this action."),
            okButtonProps = { danger: true, type: "primary" },
            okText = gettext("OK"),
            autoFocusButton = "cancel",
            ...rest
        }: ConfirmOptions) => {
            modal.confirm({
                onOk: async () => {
                    if (onOk) {
                        try {
                            await onOk();
                        } catch (err) {
                            if (errorMessage && !isAbortError(err)) {
                                messageApi.error(errorMessage);
                            }
                            throw err;
                        }
                    }
                },
                title,
                okText,
                content,
                okButtonProps,
                autoFocusButton,
                ...rest,
            });
        },
        [messageApi, modal]
    );

    const confirmDelete = useCallback(
        ({
            content = gettext("Please confirm the deletion."),
            okText = gettext("Delete"),
            errorMessage = gettext("Failed to delete."),
            ...rest
        }) => {
            confirm({ content, okText, errorMessage, ...rest });
        },
        [confirm]
    );

    return {
        modal,
        messageApi,
        contextHolder: (
            <>
                {modalContextHolder}
                {messageContextHolder}
            </>
        ),
        confirm,
        confirmDelete,
    };
}
