import { lazy, useCallback } from "react";

import { useShowModal } from "@nextgisweb/gui/index";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type {
  VersionHistoryMenuCtx,
  VersionHistoryMenuItem,
} from "../../VersionHistoryRowMenu";

const CopyModalLazy = lazy(() => import("./CopyModal"));

export function useCopyMenuItem({
  versionId,
  resourceId,
}: VersionHistoryMenuCtx): VersionHistoryMenuItem {
  const { showModal, modalHolder } = useShowModal();

  const openDialog = useCallback(() => {
    showModal(CopyModalLazy, {
      versionId,
      resourceId,
    });
  }, [versionId, showModal, resourceId]);

  return {
    item: {
      key: "create_copy",
      label: gettext("Create copy"),
      onClick: openDialog,
    },
    holder: modalHolder,
  };
}
