import { gettext, ngettextf } from "@nextgisweb/pyramid/i18n";
import { confirmDelete, layoutStore } from "@nextgisweb/pyramid/layout";

export function confirmThenDelete(onOk: () => void) {
    confirmDelete({
        onOk,
        content: gettext(
            "Please confirm resource deletion. This action cannot be undone."
        ),
    });
}

export function notifySuccessfulDeletion(count: number) {
    layoutStore.message?.success(
        ngettextf(
            "The resource has been deleted",
            "{} resources have been deleted",
            count
        )(count)
    );
}
export function notifySuccessfulMove(count: number) {
    layoutStore.message?.success(
        ngettextf(
            "The resource has been moved",
            "{} resources have been moved",
            count
        )(count)
    );
}
export function notifyMoveWithError(successIds: number[], errorIds: number[]) {
    layoutStore.message?.warning(
        `${gettext("Not all resources moved")} (${successIds.length}/${
            errorIds.length
        })`
    );
}
export function notifyMoveAbsolutError(errorIds: number[]) {
    const count = errorIds.length;
    layoutStore.message?.error(
        ngettextf(
            "The resource has been moved",
            "{} resources have been moved",
            count
        )(count)
    );
}
