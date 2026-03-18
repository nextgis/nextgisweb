import { parse } from "papaparse";
import { useEffect, useState } from "react";

import type { CsvDialect, CsvParsingOutput } from "../type";

export function useCsvParser(file: File | null, dialect: CsvDialect) {
  const [result, setResult] = useState<CsvParsingOutput | undefined>();

  const { delimiter, quoteChar, escapeChar, encoding } = dialect;

  useEffect(() => {
    if (!file) {
      setResult(undefined);
      return;
    }

    setResult(undefined);

    parse<string[]>(file, {
      delimiter,
      quoteChar,
      escapeChar,
      encoding,
      skipEmptyLines: "greedy",
      worker: true,

      complete: (res) => {
        const rows = res.data as string[][];

        if (!rows.length) {
          setResult({
            rows: [],
            headers: [],
            totalRows: 0,
          });
          return;
        }

        const [headers, ...data] = rows;

        setResult({
          headers,
          rows: data,
          totalRows: data.length,
        });
      },
    });
  }, [file, delimiter, quoteChar, escapeChar, encoding]);

  return result;
}
