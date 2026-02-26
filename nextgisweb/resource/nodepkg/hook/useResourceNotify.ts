import { useCallback } from "react";

import type { message } from "@nextgisweb/gui/antd";
import { useConfirm } from "@nextgisweb/gui/hook/useConfirm";
import { gettext, ngettextf } from "@nextgisweb/pyramid/i18n";

type MessageInstance = ReturnType<typeof message.useMessage>[0];

export function showSuccessfulDeletion(
    messageApi: MessageInstance,
    count: number
) {
    messageApi.success(
        ngettextf(
            "The resource has been deleted",
            "{} resources have been deleted",
            count
        )(count)
    );
}
export function showSuccessfulMove(messageApi: MessageInstance, count: number) {
    messageApi.success(
        ngettextf(
            "The resource has been moved",
            "{} resources have been moved",
            count
        )(count)
    );
}
export function showMoveWithError(
    messageApi: MessageInstance,
    successIds: number[],
    errorIds: number[]
) {
    messageApi.warning(
        `${gettext("Not all resources moved")} (${successIds.length}/${
            errorIds.length
        })`
    );
}
export function showMoveAbsolutError(
    messageApi: MessageInstance,
    errorIds: number[]
) {
    const count = errorIds.length;
    messageApi.error(
        ngettextf(
            "The resource has been moved",
            "{} resources have been moved",
            count
        )(count)
    );
}

export function useResourceNotify() {
    const { confirmDelete, messageApi, contextHolder } = useConfirm();

    function confirmThenDelete(onOk: () => void) {
        confirmDelete({
            onOk,
            content: gettext(
                "Please confirm resource deletion. This action cannot be undone."
            ),
        });
    }

    const notifySuccessfulDeletion = useCallback(
        (count: number) => {
            showSuccessfulDeletion(messageApi, count);
        },
        [messageApi]
    );
    const notifySuccessfulMove = useCallback(
        (count: number) => {
            showSuccessfulMove(messageApi, count);
        },
        [messageApi]
    );
    const notifyMoveWithError = useCallback(
        (successIds: number[], errorIds: number[]) => {
            showMoveWithError(messageApi, successIds, errorIds);
        },
        [messageApi]
    );
    const notifyMoveAbsolutError = useCallback(
        (errorIds: number[]) => {
            showMoveAbsolutError(messageApi, errorIds);
        },
        [messageApi]
    );

    return {
        contextHolder,
        confirmThenDelete,
        notifyMoveWithError,
        notifySuccessfulMove,
        notifyMoveAbsolutError,
        notifySuccessfulDeletion,
    };
}
