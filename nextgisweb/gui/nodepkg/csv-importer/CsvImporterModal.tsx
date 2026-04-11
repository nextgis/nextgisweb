import { useCallback, useState } from "react";

import { Button, Modal } from "@nextgisweb/gui/antd";
import type { ModalProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { CsvImporter } from "./CsvImporter";
import type { CsvImporterRow, TargetColumn } from "./type";

const msgTitle = gettext("Import from CSV");
const msgCancel = gettext("Cancel");
const msgImport = gettext("Import");

export interface CsvImporterModalProps extends Omit<
  ModalProps,
  "children" | "footer" | "onOk"
> {
  targetColumns: TargetColumn[];
  contentHeight?: number | string;
  submitText?: string;
  cancelText?: string;
  onSubmit?: (rows: CsvImporterRow[]) => void | Promise<void>;
  close?: () => void;
}

export default function CsvImporterModal({
  targetColumns,
  contentHeight = 600,
  submitText = msgImport,
  cancelText = msgCancel,
  title = msgTitle,
  width = 900,
  centered = true,
  onCancel,
  onSubmit,
  close,
  ...props
}: CsvImporterModalProps) {
  const [rows, setRows] = useState<CsvImporterRow[] | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const handleCancel = useCallback(
    (e: Parameters<NonNullable<ModalProps["onCancel"]>>[0]) => {
      onCancel?.(e);
    },
    [onCancel]
  );

  const handleSubmit = useCallback(async () => {
    if (!rows || rows.length === 0) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit?.(rows);
      close?.();
    } finally {
      setSubmitting(false);
    }
  }, [close, onSubmit, rows]);

  return (
    <Modal
      {...props}
      title={title}
      width={width}
      centered={centered}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={() => close?.()}>
          {cancelText}
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          disabled={!rows || rows.length === 0}
          onClick={handleSubmit}
        >
          {submitText}
        </Button>,
      ]}
    >
      <div style={{ height: contentHeight }}>
        <CsvImporter targetColumns={targetColumns} onChange={setRows} />
      </div>
    </Modal>
  );
}

CsvImporterModal.displayName = "CsvImporterModal";
