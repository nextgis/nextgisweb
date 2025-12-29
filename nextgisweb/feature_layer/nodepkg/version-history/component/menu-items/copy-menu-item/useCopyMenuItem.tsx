import { useCallback } from "react";

import { useShowModal } from "@nextgisweb/gui/index";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type {
    VersionHistoryMenuCtx,
    VersionHistoryMenuItem,
} from "../../VersionHistoryRowMenu";

export function useCopyMenuItem({
    versionId,
    resourceId,
}: VersionHistoryMenuCtx): VersionHistoryMenuItem {
    const { lazyModal, modalHolder } = useShowModal();

    const openDialog = useCallback(() => {
        lazyModal(() => import("./CopyModal"), {
            versionId: versionId,
            resourceId: resourceId,
        });
    }, [versionId, lazyModal, resourceId]);

    return {
        item: {
            key: "create_copy",
            label: gettext("Create copy"),
            onClick: openDialog,
        },
        holder: modalHolder,
    };
}
