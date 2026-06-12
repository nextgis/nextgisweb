import { Suspense, lazy, useCallback, useState } from "react";

import type { ModalProps } from "@nextgisweb/gui/antd";
import { EditorModal } from "@nextgisweb/gui/editor-modal/EditorModal";
import { useConfirm } from "@nextgisweb/gui/hook/useConfirm";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { CompositeWidgetProps } from "./CompositeWidget";

const CompositeWidgetLazy = lazy(
  () => import("@nextgisweb/resource/composite")
);

type ModalCancelEvent = Parameters<NonNullable<ModalProps["onCancel"]>>[0];

const msgCloseTitle = gettext("Unsaved changes");
const msgCloseContent = gettext(
  "There are unsaved changes. Close without saving?"
);
const msgCloseOk = gettext("Close without saving");

export type CompositeWidgetModalProps = Pick<
  ModalProps,
  "open" | "onCancel" | "afterClose"
> &
  Pick<CompositeWidgetProps, "setup" | "store" | "onSave"> & {
    close?: () => void;
    className?: string;
  };

export function CompositeWidgetModal({
  className,
  onSave: onSaveProp,
  setup,
  store,
  open,
  close,
  onCancel,
  afterClose,
}: CompositeWidgetModalProps) {
  const [dirty, setDirty] = useState(false);
  const { confirm, contextHolder } = useConfirm();

  const closeModal = useCallback(() => {
    close?.();
  }, [close]);

  const closeFromCancel = useCallback(
    (event: ModalCancelEvent) => {
      if (onCancel) {
        onCancel(event);
      } else {
        closeModal();
      }
    },
    [closeModal, onCancel]
  );

  const confirmClose = useCallback(
    (onConfirm: () => void) => {
      if (!dirty) {
        onConfirm();
        return;
      }

      confirm({
        title: msgCloseTitle,
        content: msgCloseContent,
        okText: msgCloseOk,
        onOk: onConfirm,
      });
    },
    [confirm, dirty]
  );

  const handleClose = useCallback(() => {
    confirmClose(closeModal);
  }, [closeModal, confirmClose]);

  const handleCancel = useCallback(
    (event: ModalCancelEvent) => {
      confirmClose(() => {
        closeFromCancel(event);
      });
    },
    [closeFromCancel, confirmClose]
  );

  const onSave = useCallback(async () => {
    await onSaveProp?.();

    closeModal();
  }, [onSaveProp, closeModal]);

  return (
    <EditorModal
      open={open ?? true}
      onCancel={handleCancel}
      afterClose={afterClose}
      closable={false}
      className={className}
    >
      {contextHolder}
      <Suspense>
        <CompositeWidgetLazy
          setup={setup}
          store={store}
          onSave={onSave}
          unsavedChanges={false}
          onDirty={setDirty}
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
