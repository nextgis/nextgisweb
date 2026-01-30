import { useCallback } from "react";

import { useShowModal } from "@nextgisweb/gui/index";
import { useResourceNotify } from "@nextgisweb/resource/hook/useResourceNotify";

import { ActionBtn } from "../component/ActionBtn";
import type { ResourceActionWidgetProps } from "../../registry";

export default function DeleteAction({
    id,
    icon,
    label,
    setTableItems,
}: ResourceActionWidgetProps) {
    const { lazyModal, modalHolder } = useShowModal();
    const { notifySuccessfulDeletion, contextHolder } = useResourceNotify();
    const deleteModelItem = useCallback(() => {
        const { destroy } = lazyModal(
            () => import("@nextgisweb/resource/delete-page/DeletePageModal"),
            {
                onCancelDelete: () => {
                    destroy();
                },
                onOkDelete: () => {
                    destroy();
                    setTableItems((old) => old.filter((x) => x.id !== id));
                    notifySuccessfulDeletion(1);
                },
                // modal mask not clickable without onCancel
                onCancel: () => {
                    destroy();
                },
                resources: [id],
            }
        );
    }, [id, lazyModal, notifySuccessfulDeletion, setTableItems]);

    return (
        <>
            {contextHolder}
            {modalHolder}
            <ActionBtn icon={icon} label={label} onClick={deleteModelItem} />
        </>
    );
}
