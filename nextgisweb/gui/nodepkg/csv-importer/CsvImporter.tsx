import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CsvDialectForm,
  CsvFileSelect,
  CsvMetaDisplay,
  CsvPreviewTable,
} from "./component";
import { useCsvParser } from "./hooks/useCsvParser";
import { DEFAULT_DIALECT } from "./settings";
import type { CsvColumn, CsvDialect } from "./type";
import { buildRows, getDuplicatedIndices, matchColumns } from "./utils";

export interface CsvImporterProps {
  columns: CsvColumn[];
  onChange: (rows: Record<string, string>[] | undefined) => void;
}

export function CsvImporter({ columns, onChange }: CsvImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dialect, setDialect] = useState<CsvDialect>(DEFAULT_DIALECT);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const parsed = useCsvParser(file, dialect);

  const matches = useMemo(
    () => (parsed ? matchColumns(parsed.headers, columns) : new Map()),
    [parsed, columns]
  );

  const { duplicatedIndices, rows } = useMemo(() => {
    if (!parsed)
      return { duplicatedIndices: new Set<number>(), rows: undefined };
    const duplicatedIndices = getDuplicatedIndices(parsed.headers, matches);
    const rows = buildRows(parsed, matches, duplicatedIndices);
    return { duplicatedIndices, rows };
  }, [parsed, matches]);

  useEffect(() => {
    onChangeRef.current(rows);
  }, [rows]);

  const handleFileChange = useCallback((file: File | null) => {
    setFile(file);
    setDialect(DEFAULT_DIALECT);
  }, []);

  const handleDialectChange = useCallback(
    <Key extends keyof CsvDialect>(key: Key, val: CsvDialect[Key]) => {
      setDialect((prev) => ({ ...prev, [key]: val }));
    },
    []
  );

  if (!file) {
    return <CsvFileSelect onChange={handleFileChange} />;
  }

  return (
    <div>
      <CsvMetaDisplay
        file={file}
        onClear={() => handleFileChange(null)}
        rowsCount={parsed?.totalRows}
      />

      <CsvPreviewTable
        parsed={parsed}
        matches={matches}
        duplicatedIndices={duplicatedIndices}
      />

      <CsvDialectForm value={dialect} onChange={handleDialectChange} />
    </div>
  );
}

CsvImporter.displayName = "CsvImporter";
