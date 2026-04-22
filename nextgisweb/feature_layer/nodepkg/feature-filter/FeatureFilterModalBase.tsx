import { useCallback, useEffect, useState } from "react";
import type { ComponentType } from "react";

import { EditorModal } from "@nextgisweb/gui/editor-modal/EditorModal";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";

import type { FilterExpressionString } from "./type";

import "./FeatureFilterModalBase.less";

export interface ControlledFilterEditorProps {
  value?: FilterExpressionString | undefined;
  onChange?: (value: FilterExpressionString | undefined) => void;
  onApply?: (value: FilterExpressionString | undefined) => void;
  onCancel?: (e?: any) => void;
}

export interface FeatureFilterModalBaseProps<
  P extends ControlledFilterEditorProps,
> extends ShowModalOptions {
  open?: boolean;
  value?: FilterExpressionString | undefined;
  EditorComponent: ComponentType<P>;
  editorProps: Omit<P, keyof ControlledFilterEditorProps>;
  onCancel?: (e?: any) => void;
  onApply?: (filter: FilterExpressionString | undefined) => void;
}

export function FeatureFilterModalBase<P extends ControlledFilterEditorProps>({
  open: openProp,
  value,
  EditorComponent,
  editorProps,
  onCancel,
  onApply,
  ...modalProps
}: FeatureFilterModalBaseProps<P>) {
  const [open, setOpen] = useState(openProp ?? true);
  const [filter, setFilter] = useState<FilterExpressionString | undefined>(
    value
  );

  useEffect(() => {
    if (openProp !== undefined) {
      setOpen(openProp);
    }
  }, [openProp]);

  const handleClose = useCallback(() => {
    setOpen(false);
    onCancel?.(undefined);
  }, [onCancel]);

  const handleApply = useCallback(() => {
    onApply?.(filter);
    handleClose();
  }, [filter, handleClose, onApply]);

  return (
    <EditorModal
      open={open}
      onCancel={handleClose}
      modalClassName="ngw-feature-filter-modal"
      {...modalProps}
    >
      <EditorComponent
        {...(editorProps as P)}
        value={filter}
        onChange={setFilter}
        onApply={handleApply}
        onCancel={handleClose}
      />
    </EditorModal>
  );
}
