export type CsvImporterRow = Record<string, string>;

export interface TargetColumn {
  key: string;
  label: string;
  aliases: string[];
}

export interface CsvDialect {
  delimiter: string;
  quoteChar: string;
  escapeChar: string;
  encoding: string;
}

export interface CsvParsingOutput {
  csvColumns: string[];
  rows: string[][];
  totalRows: number;
}
