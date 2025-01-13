import { Modal } from "@nextgisweb/gui/antd";
import type { ModalProps } from "@nextgisweb/gui/antd";

import { DeletePage } from "./DeletePage";

interface DeleteConfirmModalProps extends ModalProps {
    resources: number[];
    onOkDelete: () => void;
    onCancelDelete: () => void;
}

export function DeleteConfirmModal({
    resources,
    onOkDelete,
    onCancelDelete,
    ...props
}: DeleteConfirmModalProps) {
    return (
        <Modal destroyOnClose closable={false} footer={null} {...props}>
            <DeletePage
                resources={resources}
                isModal={true}
                onCancel={onCancelDelete}
                onOk={onOkDelete}
            />
        </Modal>
    );
}
