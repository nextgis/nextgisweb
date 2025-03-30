import { message } from "@nextgisweb/gui/antd";
import { confirmDelete } from "@nextgisweb/gui/confirm";
import { gettext, ngettextf } from "@nextgisweb/pyramid/i18n";

export function confirmThenDelete(onOk: () => void) {
    confirmDelete({
        onOk,
        content: gettext(
            "Please confirm resource deletion. This action cannot be undone."
        ),
    });
}

export function notifySuccessfulDeletion(count: number) {
    message.success(
        ngettextf(
            "The resource has been deleted",
            "{} resources have been deleted",
            count
        )(count)
    );
}
export function notifySuccessfulMove(count: number) {
    message.success(
        ngettextf(
            "The resource has been moved",
            "{} resources have been moved",
            count
        )(count)
    );
}
export function notifyMoveWithError(successIds: number[], errorIds: number[]) {
    message.warning(
        `${gettext("Not all resources moved")} (${successIds.length}/${
            errorIds.length
        })`
    );
}
export function notifyMoveAbsolutError(errorIds: number[]) {
    const count = errorIds.length;
    message.error(
        ngettextf(
            "The resource has been moved",
            "{} resources have been moved",
            count
        )(count)
    );
}
