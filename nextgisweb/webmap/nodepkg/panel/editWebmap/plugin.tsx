/** @plugin */

import { Suspense, lazy, useCallback, useEffect, useMemo } from "react";

import { EditorModal } from "@nextgisweb/gui/editor-modal/EditorModal";
import type { ModalProps } from "@nextgisweb/gui/editor-modal/EditorModal";
import { EditIcon } from "@nextgisweb/gui/icon";
import { useRoute } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { resourceAttrItem } from "@nextgisweb/resource/api/resource-attr";
import type { CompositeSetup } from "@nextgisweb/resource/composite/CompositeStore";
import type { Display } from "@nextgisweb/webmap/display";
import { registry } from "@nextgisweb/webmap/panel/registry";

const CompositeWidgetLazy = lazy(
  () => import("@nextgisweb/resource/composite")
);

export function WebmapEditModal({
  display,
  open,
  close,
  onCancel,
  afterClose,
}: Pick<ModalProps, "open" | "onCancel" | "afterClose"> & {
  display: Display;
  close?: () => void;
}) {
  const webmapId = display.config.webmapId;
  const { route: routeDisplayConfig, abort: abortDisplayConfig } = useRoute(
    "webmap.display_config",
    {
      id: webmapId,
    }
  );

  const setup = useMemo<CompositeSetup>(
    () => ({
      id: webmapId,
      operation: "update",
    }),
    [webmapId]
  );

  const handleClose = useCallback(() => {
    close?.();
  }, [close]);

  const onSave = useCallback(async () => {
    abortDisplayConfig();
    const newConfig = await routeDisplayConfig.get();
    display.config.update(newConfig);
    handleClose();
  }, [abortDisplayConfig, display.config, handleClose, routeDisplayConfig]);

  useEffect(() => {
    return () => {
      abortDisplayConfig();
    };
  }, [abortDisplayConfig]);

  return (
    <EditorModal
      open={open ?? true}
      onCancel={onCancel}
      afterClose={afterClose}
      closable={false}
      modalClassName="ngw-webmap-editor-modal"
    >
      <Suspense>
        <CompositeWidgetLazy
          setup={setup}
          onSave={onSave}
          unsavedChanges={false}
          rightActions={[
            {
              action: handleClose,
              title: gettext("Cancel"),
            },
          ]}
        />
      </Suspense>
    </EditorModal>
  );
}

registry.register(COMP_ID, {
  name: "edit-webmap",
  type: "action",
  action: ({ display, showModal }) => {
    showModal(WebmapEditModal, { display });
  },
  isEnabled: async ({ config }) => {
    const item = await resourceAttrItem({
      resource: config.webmapId,
      attributes: [["resource.has_permission", "resource.update"]],
    });
    const isEditable = item.get("resource.has_permission", "resource.update");
    return isEditable;
  },
  title: gettext("Edit web map"),
  icon: <EditIcon />,
  order: 60,

  placement: "end",
});
