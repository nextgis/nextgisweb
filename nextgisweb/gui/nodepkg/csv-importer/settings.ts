import { gettext } from "@nextgisweb/pyramid/i18n";

import type { CsvDialect } from "./type";

export const DELIMITER_OPTIONS = [
  { value: "", label: gettext("Auto-detected") },
  { value: ",", label: gettext("Comma") },
  { value: ";", label: gettext("Semicolon") },
  { value: "\t", label: gettext("Tab") },
  { value: "|", label: gettext("Pipe") },
];

export const QUOTE_OPTIONS = [
  { value: '"', label: gettext("Double quote") },
  { value: "'", label: gettext("Single quote") },
  { value: "", label: gettext("None") },
];

export const ESCAPE_OPTIONS = [
  { value: '"', label: gettext("Double quote") },
  { value: "\\", label: gettext("Backslash") },
  { value: "", label: gettext("None") },
];

export const ENCODING_OPTIONS = [
  { value: "UTF-8", label: "UTF-8" },
  { value: "windows-1251", label: "Windows-1251" },
  { value: "windows-1252", label: "Windows-1252" },
  { value: "ISO-8859-1", label: "ISO-8859-1" },
];

export const DEFAULT_DIALECT: CsvDialect = {
  delimiter: "",
  quoteChar: '"',
  escapeChar: '"',
  encoding: "UTF-8",
};
