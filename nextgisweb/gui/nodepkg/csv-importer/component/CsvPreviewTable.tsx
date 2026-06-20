import classNames from "classnames";
import { useMemo } from "react";
import type { ComponentProps } from "react";

import { Table } from "@nextgisweb/gui/antd";
import { useThemeVariables } from "@nextgisweb/gui/hook";

import type { CsvParsingOutput, TargetColumn } from "../type";

import "./CsvPreviewTable.less";

interface CsvPreviewTableProps {
  parsed: CsvParsingOutput;
  matches: Map<TargetColumn, number>;
}

export function CsvPreviewTable({ parsed, matches }: CsvPreviewTableProps) {
  const columns: ComponentProps<typeof Table<any>>["columns"] = useMemo(() => {
    const matchedIndices = new Set(matches.values());
    return parsed.csvColumns.map((column, index) => ({
      key: index,
      className: classNames({ bound: matchedIndices.has(index) }),
      dataIndex: index,
      title: column,
    }));
  }, [parsed.csvColumns, matches]);

  const dataSource = useMemo(
    () =>
      parsed.rows.map((row, rowIdx) => ({
        key: rowIdx,
        ...Object.fromEntries(row.map((cell, idx) => [idx, cell])),
      })),
    [parsed.rows]
  );

  const themeVariables = useThemeVariables({
    "theme-color-success-bg": "colorSuccessBg",
  });

  return (
    <Table
      className="ngw-gui-csv-importer-preview"
      style={themeVariables}
      tableLayout="auto"
      parentHeight={true}
      size="small"
      columns={columns}
      dataSource={dataSource}
    />
  );
}

CsvPreviewTable.displayName = "CsvPreviewTable";
