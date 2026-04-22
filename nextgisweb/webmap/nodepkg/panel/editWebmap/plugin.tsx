/** @plugin */

import { Suspense, lazy, useCallback } from "react";

import { EditorModal } from "@nextgisweb/gui/editor-modal/EditorModal";
import { EditIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { resourceAttrItem } from "@nextgisweb/resource/api/resource-attr";
import type { CompositeSetup } from "@nextgisweb/resource/composite/CompositeStore";
import { registry } from "@nextgisweb/webmap/panel/registry";

const CompositeWidgetLazy = lazy(
  () => import("@nextgisweb/resource/composite")
);

export function WebmapEditModal({
  setup,
  onCancel,
}: {
  setup: CompositeSetup;
  onCancel?: () => void;
}) {
  const handleClose = useCallback(() => {
    const close_ = () => {
      onCancel?.();
    };
    close_();
    // if (store.dirty) {
    //   modal.confirm({
    //     title: msgConfirmTitle,
    //     content: msgConfirmContent,
    //     onOk: close_,
    //   });
    // } else {
    //   close_();
    // }
  }, [onCancel]);

  const onSave = useCallback(() => {
    handleClose();
  }, [handleClose]);

  return (
    <EditorModal
      open
      onCancel={handleClose}
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
  type: "action",
  action: ({ display, showModal }) => {
    const modal = showModal(() => (
      <WebmapEditModal
        setup={{
          id: display.config.webmapId,
          operation: "update",
        }}
        onCancel={() => {
          modal?.destroy();
        }}
      />
    ));

    // const editUrl = routeURL("resource.update", display.config.webmapId);
    // window.open(editUrl, "_blank");
  },
  name: "edit-webmap",
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
