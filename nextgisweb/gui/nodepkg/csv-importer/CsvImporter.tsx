import { useCallback, useMemo, useState } from "react";

import {
  CsvDialectForm,
  CsvFileSelect,
  CsvMetaDisplay,
  CsvPreviewTable,
} from "./component";
import { useCsvParser } from "./hooks/useCsvParser";
import { DEFAULT_DIALECT } from "./settings";
import type { CsvColumn, CsvDialect } from "./type";
import { matchColumns } from "./utils/matchColumns";

export interface CsvImporterProps {
  columns: CsvColumn[];
  onChange: (rows: Record<string, string>[] | undefined) => void;
}

export function CsvImporter({
  columns,
  onChange: _onChange,
}: CsvImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dialect, setDialect] = useState<CsvDialect>(DEFAULT_DIALECT);

  const parsed = useCsvParser(file, dialect);
  const matches = useMemo(
    () => (parsed ? matchColumns(parsed.headers, columns) : new Map()),
    [parsed, columns]
  );

  const handleFileChange = useCallback((f: File | null) => {
    setFile(f);
    setDialect(DEFAULT_DIALECT);
  }, []);

  const handleDialectChange = useCallback(
    <K extends keyof CsvDialect>(key: K, val: CsvDialect[K]) => {
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

      <CsvPreviewTable parsed={parsed} matches={matches} />

      <CsvDialectForm value={dialect} onChange={handleDialectChange} />
    </div>
  );
}

CsvImporter.displayName = "CsvImporter";
