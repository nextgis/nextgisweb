import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, Button, Spin } from "@nextgisweb/gui/antd";
import { useThemeVariables } from "@nextgisweb/gui/hook";
import { gettext, ngettextf } from "@nextgisweb/pyramid/i18n";

import { CsvDialectForm, CsvFileSelect, CsvPreviewTable } from "./component";
import { CsvManualMapping } from "./component/CsvManualMapping";
import { useCsvParser } from "./hooks/useCsvParser";
import { DEFAULT_DIALECT } from "./settings";
import type { CsvDialect, CsvImporterRow, TargetColumn } from "./type";
import { buildRows, matchColumns } from "./utils";

import BackspaceIcon from "@nextgisweb/icon/material/backspace";
import "./CsvImporter.less";

const msgColumnMapping = gettext("Column mapping");
const msgPreviewCsv = gettext("Preview CSV table");
const msgParsingOptions = gettext("Parsing options");
const msgParseError = gettext("Failed to parse CSV file");
const msgClearFile = gettext("Clear file");
const msgRowsInFile = (n: number) => ngettextf("{} row", "{} rows", n)(n);

export interface CsvImporterProps {
  targetColumns: TargetColumn[];
  onChange: (rows: CsvImporterRow[] | undefined) => void;
}

export function CsvImporter({ targetColumns, onChange }: CsvImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dialect, setDialect] = useState<CsvDialect>(DEFAULT_DIALECT);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const { result: parsed, error, isLoading } = useCsvParser(file, dialect);

  const autoMatches = useMemo(
    () =>
      parsed
        ? matchColumns(parsed.csvColumns, targetColumns)
        : new Map<TargetColumn, number>(),
    [parsed, targetColumns]
  );

  const [matches, setMatches] = useState<Map<TargetColumn, number>>(
    () => autoMatches
  );

  useEffect(() => {
    setMatches(autoMatches);
  }, [autoMatches]);

  const handleMatchChange = useCallback(
    (target: TargetColumn, csv: number | undefined) => {
      setMatches((prev) => {
        const next = new Map(prev);
        if (csv === undefined) {
          next.delete(target);
        } else {
          next.set(target, csv);
        }
        return next;
      });
    },
    []
  );

  const rows = useMemo(() => {
    if (!parsed) return undefined;
    return matches.size > 0 ? buildRows(parsed, matches) : undefined;
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

  const themeVariables = useThemeVariables({
    "theme-font-size-lg": "fontSizeLG",
    "theme-padding-sm": "paddingSM",
    "theme-padding-xs": "paddingXS",
    "theme-color-border": "colorBorder",
    "theme-font-weight-strong": "fontWeightStrong",
    "theme-color-border-secondary": "colorBorderSecondary",
  });

  return (
    <div className="ngw-gui-csv-importer" style={themeVariables}>
      {!file ? (
        <CsvFileSelect onChange={handleFileChange} />
      ) : (
        <>
          {error ? (
            <div className="error">
              <Alert
                type="error"
                showIcon
                title={msgParseError}
                description={
                  <Button size="small" onClick={() => handleFileChange(null)}>
                    {msgClearFile}
                  </Button>
                }
              />
            </div>
          ) : isLoading || !parsed ? (
            <div className="spin">
              <Spin size="large" />
            </div>
          ) : (
            <>
              <div className="mapping-title">{msgColumnMapping}</div>
              <div className="mapping-wrapper">
                <CsvManualMapping
                  targetColumns={targetColumns}
                  csvColumns={parsed.csvColumns}
                  matches={matches}
                  onMatchChange={handleMatchChange}
                />
              </div>
              <div className="preview-title">{msgPreviewCsv}</div>
              <div className="preview-wrapper">
                <CsvPreviewTable parsed={parsed} matches={matches} />
                <div className="file">
                  <div className="rows">{msgRowsInFile(parsed.totalRows)}</div>
                  <div className="name">{file.name}</div>
                  <Button
                    className="clear"
                    title={msgClearFile}
                    type="link"
                    icon={<BackspaceIcon />}
                    onClick={() => handleFileChange(null)}
                  />
                </div>
              </div>
            </>
          )}
          <div className="options-title">{msgParsingOptions}</div>
          <CsvDialectForm value={dialect} onChange={handleDialectChange} />
        </>
      )}
    </div>
  );
}

CsvImporter.displayName = "CsvImporter";
