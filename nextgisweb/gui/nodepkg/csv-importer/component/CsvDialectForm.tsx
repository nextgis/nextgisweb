import { Select } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import {
  DELIMITER_OPTIONS,
  ENCODING_OPTIONS,
  ESCAPE_OPTIONS,
  QUOTE_OPTIONS,
} from "../settings";
import type { CsvDialect } from "../type";

const msgDelimiter = gettext("Delimiter");
const msgQuoteChar = gettext("Quote char");
const msgEscapeChar = gettext("Escape char");
const msgEncoding = gettext("Encoding");

export interface CsvDialectFormProps {
  value: CsvDialect;
  onChange: <K extends keyof CsvDialect>(key: K, val: CsvDialect[K]) => void;
}

export function CsvDialectForm({ value, onChange }: CsvDialectFormProps) {
  return (
    <div className="csv-dialect-form">
      <div className="labels">
        <div className="label">{msgDelimiter}</div>
        <div className="label">{msgQuoteChar}</div>
        <div className="label">{msgEscapeChar}</div>
        <div className="label">{msgEncoding}</div>
      </div>
      <div className="selects">
        <Select
          className="select"
          value={value.delimiter}
          onChange={(v) => onChange("delimiter", v)}
          options={DELIMITER_OPTIONS}
        />
        <Select
          className="select"
          value={value.quoteChar}
          onChange={(v) => onChange("quoteChar", v)}
          options={QUOTE_OPTIONS}
        />
        <Select
          className="select"
          value={value.escapeChar}
          onChange={(v) => onChange("escapeChar", v)}
          options={ESCAPE_OPTIONS}
        />
        <Select
          className="select"
          value={value.encoding}
          onChange={(v) => onChange("encoding", v)}
          options={ENCODING_OPTIONS}
        />
      </div>
    </div>
  );
}

CsvDialectForm.displayName = "CsvDialectForm";
