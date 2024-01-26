import { message } from "@nextgisweb/gui/antd";
import { confirmDelete } from "@nextgisweb/gui/confirm";
import { gettext, ngettext } from "@nextgisweb/pyramid/i18n";

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
        ngettext(
            "The resource has been deleted",
            "{} resources have been deleted",
            count
        ).replace("{}", String(count))
    );
}
export function notifySuccessfulMove(count: number) {
    message.success(
        ngettext(
            "The resource has been moved",
            "{} resources have been moved",
            count
        ).replace("{}", String(count))
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
        ngettext(
            "The resource has been moved",
            "{} resources have been moved",
            count
        ).replace("{}", String(count))
    );
}
