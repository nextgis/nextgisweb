import { Select } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";

import {
  DELIMITER_OPTIONS,
  ENCODING_OPTIONS,
  ESCAPE_OPTIONS,
  QUOTE_OPTIONS,
} from "../settings";
import type { CsvDialect } from "../type";

const msgDelimiter = gettext("Delimiter");
const msgQuoteChar = gettext("Quote character");
const msgEscapeChar = gettext("Escape character");
const msgEncoding = gettext("Encoding");

export interface CsvDialectFormProps {
  value: CsvDialect;
  onChange: <K extends keyof CsvDialect>(key: K, val: CsvDialect[K]) => void;
}

export function CsvDialectForm({ value, onChange }: CsvDialectFormProps) {
  return (
    <Area
      rootClassName="ngw-gui-csv-importer-options"
      labelPosition="top"
      cols={["1fr", "1fr", "1fr", "1fr"]}
    >
      <Lot label={msgDelimiter}>
        <Select
          style={{ width: "100%" }}
          value={value.delimiter}
          options={DELIMITER_OPTIONS}
          onChange={(v) => onChange("delimiter", v)}
        />
      </Lot>
      <Lot label={msgQuoteChar}>
        <Select
          style={{ width: "100%" }}
          value={value.quoteChar}
          options={QUOTE_OPTIONS}
          onChange={(v) => onChange("quoteChar", v)}
        />
      </Lot>
      <Lot label={msgEscapeChar}>
        <Select
          style={{ width: "100%" }}
          value={value.escapeChar}
          options={ESCAPE_OPTIONS}
          onChange={(v) => onChange("escapeChar", v)}
        />
      </Lot>
      <Lot label={msgEncoding}>
        <Select
          style={{ width: "100%" }}
          value={value.encoding}
          options={ENCODING_OPTIONS}
          onChange={(v) => onChange("encoding", v)}
        />
      </Lot>
    </Area>
  );
}

CsvDialectForm.displayName = "CsvDialectForm";
