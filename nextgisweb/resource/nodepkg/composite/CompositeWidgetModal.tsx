import { Suspense, lazy, useCallback } from "react";

import type { ModalProps } from "@nextgisweb/gui/antd";
import { EditorModal } from "@nextgisweb/gui/editor-modal/EditorModal";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { CompositeWidgetProps } from "./CompositeWidget";

const CompositeWidgetLazy = lazy(
  () => import("@nextgisweb/resource/composite")
);

export type CompositeWidgetModalProps = Pick<
  ModalProps,
  "open" | "onCancel" | "afterClose"
> &
  Pick<CompositeWidgetProps, "setup" | "onSave"> & {
    close?: () => void;
    className?: string;
  };

export function CompositeWidgetModal({
  className,
  onSave: onSaveProp,
  setup,
  open,
  close,
  onCancel,
  afterClose,
}: CompositeWidgetModalProps) {
  const handleClose = useCallback(() => {
    close?.();
  }, [close]);

  const onSave = useCallback(async () => {
    await onSaveProp?.();

    handleClose();
  }, [onSaveProp, handleClose]);

  return (
    <EditorModal
      open={open ?? true}
      onCancel={onCancel}
      afterClose={afterClose}
      closable={false}
      className={className}
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
