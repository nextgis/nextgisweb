import { parse } from "papaparse";
import { useEffect, useRef, useState, useTransition } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";

import type { CsvDialect, CsvParsingOutput } from "../type";

export function useCsvParser(file: File | null, dialect: CsvDialect) {
  const [result, setResult] = useState<CsvParsingOutput | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isParsing, setIsParsing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const parseIdRef = useRef(0);

  const { delimiter, quoteChar, escapeChar, encoding } = dialect;

  useEffect(() => {
    const parseId = ++parseIdRef.current;

    if (!file) {
      setResult(undefined);
      setError(undefined);
      setIsParsing(false);
      return;
    }

    setResult(undefined);
    setError(undefined);
    setIsParsing(true);

    parse<string[]>(file, {
      delimiter,
      quoteChar,
      escapeChar,
      encoding,
      skipEmptyLines: "greedy",
      worker: true,
      complete: (res) => {
        if (parseId !== parseIdRef.current) return;

        const allRows = res.data as string[][];

        startTransition(() => {
          if (!allRows.length) {
            setResult({
              csvColumns: [],
              rows: [],
              totalRows: 0,
            });
            setError(undefined);
            setIsParsing(false);
            return;
          }

          const [headers = [], ...rows] = allRows;
          const csvColumns: string[] = headers.map(
            (label, index) => label ?? gettext("Column") + `${index}`
          );

          setResult({
            csvColumns,
            rows,
            totalRows: rows.length,
          });
          setError(undefined);
          setIsParsing(false);
        });
      },
      error: (error) => {
        if (parseId !== parseIdRef.current) return;
        console.error("CSV Parse Error:", error);
        setError(error.message || "Failed to parse CSV file");
        setIsParsing(false);
      },
    });

    return () => {
      parseIdRef.current += 1;
    };
  }, [file, delimiter, quoteChar, escapeChar, encoding]);

  return {
    result,
    error,
    isLoading: isParsing || isPending,
  };
}
