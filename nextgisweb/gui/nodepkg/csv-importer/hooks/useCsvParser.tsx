import { parse } from "papaparse";
import { useEffect, useState } from "react";

import type { CsvDialect } from "../type";

interface Result {
  rows: string[][];
  headers: string[];
  totalRows: number;
  meta?: {
    delimiter?: string;
    linebreak?: string;
  };
  error?: string;
}

export function useCsvParser(file: File | null, dialect: CsvDialect) {
  const [result, setResult] = useState<Result | undefined>();

  useEffect(() => {
    if (!file) {
      setResult(undefined);
      return;
    }

    parse<string[]>(file, {
      delimiter: dialect.delimiter,
      quoteChar: dialect.quoteChar,
      escapeChar: dialect.escapeChar,
      encoding: dialect.encoding,
      skipEmptyLines: true,
      preview: 1000,
      worker: true,

      complete: (res) => {
        const rows = res.data as string[][];

        if (!rows.length) {
          setResult({
            rows: [],
            headers: [],
            totalRows: 0,
            meta: res.meta,
          });
          return;
        }

        const [headers, ...data] = rows;

        setResult({
          headers,
          rows: data,
          totalRows: data.length,
          meta: res.meta,
        });
      },

      error: (err) => {
        setResult({
          rows: [],
          headers: [],
          totalRows: 0,
          error: err.message,
        });
      },
    });
  }, [file, dialect]);

  return result;
}
