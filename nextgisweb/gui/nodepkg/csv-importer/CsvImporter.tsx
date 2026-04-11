import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@nextgisweb/gui/antd";
import { useThemeVariables } from "@nextgisweb/gui/hook";
import { formatSize } from "@nextgisweb/gui/util/formatSize";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { CsvDialectForm, CsvFileSelect, CsvPreviewTable } from "./component";
import { CsvManualMapping } from "./component/CsvManualMapping";
import { useCsvParser } from "./hooks/useCsvParser";
import { DEFAULT_DIALECT } from "./settings";
import type { CsvDialect, CsvImporterRow, TargetColumn } from "./type";
import { buildRows, matchColumns } from "./utils";

import BackspaceIcon from "@nextgisweb/icon/material/backspace";
import "./CsvImporter.less";

const msgMapColumns = gettext("Field mapping");
const msgPreviewCsv = gettext("Preview CSV table");
const msgParsingOptions = gettext("Parsing options");
const msgRowsInFile = gettext("Rows in file");
const msgFile = gettext("File");
const msgSize = gettext("Size");
const msgClearFile = gettext("Clear file");

export interface CsvImporterProps {
  targetColumns: TargetColumn[];
  onChange: (rows: CsvImporterRow[] | undefined) => void;
}

export function CsvImporter({ targetColumns, onChange }: CsvImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dialect, setDialect] = useState<CsvDialect>(DEFAULT_DIALECT);
  const themeVariables = useThemeVariables({
    "theme-color-text": "colorText",
    "theme-color-border-secondary": "colorBorderSecondary",
    "theme-color-text-secondary": "colorTextSecondary",
    "theme-color-text-tertiary": "colorTextTertiary",
    "theme-control-item-bg-active": "controlItemBgActive",
  });

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

  if (!file) {
    return (
      <div
        className="csv-importer csv-importer-file-select"
        style={themeVariables}
      >
        <CsvFileSelect onChange={handleFileChange} />
      </div>
    );
  }

  return (
    <div className="csv-importer" style={themeVariables}>
      <div className="titles">
        <div className="mapping title">{msgMapColumns}</div>
        <div className="preview title">{msgPreviewCsv}</div>
      </div>
      <div className="mapping-part">
        <div className="mapping-widget">
          {parsed && (
            <CsvManualMapping
              targetColumns={targetColumns}
              csvColumns={parsed.csvColumns}
              matches={matches}
              onMatchChange={handleMatchChange}
            />
          )}
        </div>
        <div className="table-preview">
          <CsvPreviewTable
            parsed={parsed}
            matches={matches}
            isLoading={isLoading}
            parseError={error}
          />
          <div className="under-table">
            <div className="inf-part rows">
              <div className="label">{msgRowsInFile}</div>
              {parsed && <div className="value">{parsed.totalRows}</div>}
            </div>
            <div className="meta">
              <div className="inf-part size">
                <div className="label">{msgSize}</div>
                <div className="value">{formatSize(file.size)}</div>
              </div>
              <div className="inf-part file">
                <div className="label">{msgFile}</div>
                <div className="value">{file.name}</div>
                <Button
                  className="button"
                  title={msgClearFile}
                  type="link"
                  icon={<BackspaceIcon />}
                  onClick={() => handleFileChange(null)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="dialect-part">
        <div className="title">{msgParsingOptions}</div>
        <CsvDialectForm value={dialect} onChange={handleDialectChange} />
      </div>
    </div>
  );
}

CsvImporter.displayName = "CsvImporter";
