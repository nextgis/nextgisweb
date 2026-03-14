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
const msgQuoteChar = gettext("Quote char");
const msgEscapeChar = gettext("Escape char");
const msgEncoding = gettext("Encoding");

export interface CsvDialectFormProps {
  value: CsvDialect;
  onChange: <K extends keyof CsvDialect>(key: K, val: CsvDialect[K]) => void;
}

export function CsvDialectForm({ value, onChange }: CsvDialectFormProps) {
  return (
    <Area cols={["1fr", "1fr", "1fr", "1fr"]} labelPosition="left">
      <Lot label={msgDelimiter}>
        <Select
          value={value.delimiter}
          onChange={(v) => onChange("delimiter", v)}
          options={DELIMITER_OPTIONS}
          style={{ width: "100%" }}
        />
      </Lot>
      <Lot label={msgQuoteChar}>
        <Select
          value={value.quoteChar}
          onChange={(v) => onChange("quoteChar", v)}
          options={QUOTE_OPTIONS}
          style={{ width: "100%" }}
        />
      </Lot>
      <Lot label={msgEscapeChar}>
        <Select
          value={value.escapeChar}
          onChange={(v) => onChange("escapeChar", v)}
          options={ESCAPE_OPTIONS}
          style={{ width: "100%" }}
        />
      </Lot>
      <Lot label={msgEncoding}>
        <Select
          value={value.encoding}
          onChange={(v) => onChange("encoding", v)}
          options={ENCODING_OPTIONS}
          style={{ width: "100%" }}
        />
      </Lot>
    </Area>
  );
}
