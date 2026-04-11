import { Alert, Spin, Table } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { CsvParsingOutput, TargetColumn } from "../type";

import { LoadingOutlined } from "@ant-design/icons";

import "../CsvImporter.less";

interface CsvPreviewTableProps {
  parsed: CsvParsingOutput | undefined;
  matches: Map<TargetColumn, number>;
  isLoading: boolean;
  parseError?: string;
}

const msgParseError = gettext("Failed to parse CSV file");

export function CsvPreviewTable({
  parsed,
  matches,
  isLoading,
  parseError,
}: CsvPreviewTableProps) {
  if (isLoading) {
    return (
      <div className="csv-preview-table centered">
        <Spin indicator={<LoadingOutlined spin />} size="small" />
      </div>
    );
  }

  if (parseError) {
    return (
      <div className="csv-preview-table">
        <Alert
          title={parseError || msgParseError}
          type="error"
          showIcon
          banner
        />
      </div>
    );
  }

  if (!parsed) {
    return <div className="csv-preview-table" />;
  }

  const minColWidth = 160;
  const tableWidth = parsed.csvColumns.length * minColWidth;

  const matchedIndices = new Set(matches.values());

  const columns = parsed.csvColumns.map((column, index) => {
    const onCell = () =>
      matchedIndices.has(index) ? { className: "matched" } : {};

    return {
      key: index,
      dataIndex: index,
      ellipsis: true,
      width: minColWidth,
      onHeaderCell: onCell,
      onCell: onCell,
      title: column,
    };
  });

  const dataSource = parsed.rows.map((row, rowIdx) => ({
    key: rowIdx,
    ...Object.fromEntries(row.map((cell, idx) => [idx, cell])),
  }));

  return (
    <div className="csv-preview-table">
      <Table
        bordered
        size="small"
        columns={columns}
        dataSource={dataSource}
        style={{ minWidth: tableWidth }}
        sticky
      />
    </div>
  );
}

CsvPreviewTable.displayName = "CsvPreviewTable";
