export interface CsvColumn {
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
  rows: string[][];
  headers: string[];
  totalRows: number;
}
