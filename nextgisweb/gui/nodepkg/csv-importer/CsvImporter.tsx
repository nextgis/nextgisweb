import { useCallback, useState } from "react";

import { CsvDialectForm } from "./component/CsvDialectForm";
import { CsvFileSelect } from "./component/CsvFileSelect";
import { CsvMetaPreview } from "./component/CsvMetaPreview";
import { useCsvParser } from "./hooks/useCsvParser";
import { DEFAULT_DIALECT } from "./settings";
import type { CsvColumn, CsvDialect } from "./type";

export interface CsvImporterProps {
  columns: CsvColumn[];
  onChange: (rows: Record<string, string>[] | undefined) => void;
}

export function CsvImporter({
  columns: _columns,
  onChange: _onChange,
}: CsvImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dialect, setDialect] = useState<CsvDialect>(DEFAULT_DIALECT);

  const parsed = useCsvParser(file, dialect);

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
      <CsvMetaPreview
        file={file}
        onClear={() => handleFileChange(null)}
        rowsCount={parsed?.totalRows}
      />

      <div
        style={{
          height: "300px",
          border: "1px solid black",
          marginBottom: "10px",
        }}
      />

      <CsvDialectForm value={dialect} onChange={handleDialectChange} />
    </div>
  );
}

CsvImporter.displayName = "CsvImporter";
