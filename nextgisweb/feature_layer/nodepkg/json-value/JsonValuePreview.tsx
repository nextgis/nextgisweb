import { useCallback, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import type { JsonValue } from "@nextgisweb/feature-layer/type";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { JsonValueModal } from "./JsonValueModal";
import { JsonValueSummary } from "./JsonValueSummary";

import "./JsonValue.less";

const msgCancel = gettext("Cancel");
const msgEditJson = gettext("Edit JSON");
const msgInvalidJson = gettext("Invalid JSON");
const msgViewJson = gettext("View JSON");

export function jsonValueToEditorText(value: JsonValue | undefined): string {
  return value === null || value === undefined
    ? ""
    : JSON.stringify(value, null, 2);
}

export function parseJsonEditorText(value: string): JsonValue {
  return value.trim() === "" ? null : (JSON.parse(value) as JsonValue);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : msgInvalidJson;
}

interface JsonValuePreviewProps {
  id?: string;
  value?: JsonValue;
  style?: CSSProperties;
  title?: ReactNode;
  input?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  cancelText?: ReactNode;
  onChange?: (value: JsonValue) => void;
}

export function JsonValuePreview({
  id,
  value,
  style,
  title,
  input,
  disabled,
  readOnly = false,
  cancelText = msgCancel,
  placeholder,
  onChange,
}: JsonValuePreviewProps) {
  const [open, setOpen] = useState(false);
  const [editorValue, setEditorValue] = useState(() =>
    jsonValueToEditorText(value)
  );
  const [error, setError] = useState<string | null>(null);

  const modalTitle = title ?? (readOnly ? msgViewJson : msgEditJson);

  const openEditor = useCallback(() => {
    if (disabled) return;

    setEditorValue(jsonValueToEditorText(value));
    setError(null);
    setOpen(true);
  }, [disabled, value]);

  const closeEditor = useCallback(() => {
    setOpen(false);
  }, []);

  const applyEditorValue = useCallback(() => {
    try {
      onChange?.(parseJsonEditorText(editorValue));
      setError(null);
      setOpen(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [editorValue, onChange]);

  const editorText = useMemo(() => jsonValueToEditorText(value), [value]);

  if (!input && (value === null || value === undefined)) {
    return null;
  }

  return (
    <>
      <JsonValueSummary
        id={id}
        isInput={input}
        value={value}
        style={style}
        disabled={disabled}
        placeholder={placeholder}
        onOpen={openEditor}
      />
      <JsonValueModal
        open={open}
        value={readOnly ? editorText : editorValue}
        title={modalTitle}
        error={error}
        footer={readOnly ? null : (defaultFooter) => defaultFooter}
        readOnly={readOnly}
        cancelText={cancelText}
        okButtonProps={{ disabled }}
        onOk={readOnly ? undefined : applyEditorValue}
        onCancel={closeEditor}
        onChange={setEditorValue}
      />
    </>
  );
}
