export interface CsvColumn {
  key: string;
  label: string;
  aliases: string[];
}

export type CsvDialect = {
  delimiter: string;
  quoteChar: string;
  escapeChar: string;
  encoding: string;
};
