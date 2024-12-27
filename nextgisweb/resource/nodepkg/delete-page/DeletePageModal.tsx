import { Modal } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { DeletePage } from "./DeletePage";
import type { DeleteConfirmModalProps } from "./type";

export function DeleteConfirmModal({
    resources,
    onOkDelete,
    onCancelDelete,
    ...props
}: DeleteConfirmModalProps) {
    return (
        <Modal
            footer={null}
            closable={false}
            destroyOnClose
            title={gettext("Confirmation required")}
            {...props}
        >
            <DeletePage
                resources={resources}
                isModal={true}
                onCancel={onCancelDelete}
                onOk={onOkDelete}
            />
        </Modal>
    );
}
