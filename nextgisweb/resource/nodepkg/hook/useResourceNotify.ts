import { useConfirm } from "@nextgisweb/gui/hook/useConfirm";
import { gettext, ngettextf } from "@nextgisweb/pyramid/i18n";

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

    function notifySuccessfulDeletion(count: number) {
        messageApi.success(
            ngettextf(
                "The resource has been deleted",
                "{} resources have been deleted",
                count
            )(count)
        );
    }
    function notifySuccessfulMove(count: number) {
        messageApi.success(
            ngettextf(
                "The resource has been moved",
                "{} resources have been moved",
                count
            )(count)
        );
    }
    function notifyMoveWithError(successIds: number[], errorIds: number[]) {
        messageApi.warning(
            `${gettext("Not all resources moved")} (${successIds.length}/${
                errorIds.length
            })`
        );
    }
    function notifyMoveAbsolutError(errorIds: number[]) {
        const count = errorIds.length;
        messageApi.error(
            ngettextf(
                "The resource has been moved",
                "{} resources have been moved",
                count
            )(count)
        );
    }

    return {
        contextHolder,
        confirmThenDelete,
        notifyMoveWithError,
        notifySuccessfulMove,
        notifyMoveAbsolutError,
        notifySuccessfulDeletion,
    };
}
