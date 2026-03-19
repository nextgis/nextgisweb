import { Spin, Table } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { CsvColumn, CsvParsingOutput } from "../type";

import { LoadingOutlined } from "@ant-design/icons";

const msgNoMatch = gettext("No match");
const msgMatched = gettext("Matched");
const msgDuplicate = gettext("Duplicate");

interface CsvPreviewTableProps {
  parsed: CsvParsingOutput | undefined;
  matches: Map<string, CsvColumn>;
}

export function CsvPreviewTable({ parsed, matches }: CsvPreviewTableProps) {
  const containerStyle: React.CSSProperties = {
    height: "300px",
    marginBottom: "10px",
    border: "1px solid #f0f0f0",
    borderRadius: "6px",
    overflowX: "auto",
    overflowY: "auto",
  };

  if (!parsed) {
    return (
      <div
        style={{
          ...containerStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin indicator={<LoadingOutlined spin />} size="small" />
      </div>
    );
  }

  const minColWidth = 200;
  const tableWidth = parsed.headers.length * minColWidth;

  const seenKeys = new Set<string>();
  const duplicatedIndices = new Set<number>();
  for (let i = 0; i < parsed.headers.length; i++) {
    const key = matches.get(parsed.headers[i])?.key;
    if (key) {
      if (seenKeys.has(key)) {
        duplicatedIndices.add(i);
      } else {
        seenKeys.add(key);
      }
    }
  }

  const columns = parsed.headers.map((header, idx) => {
    const match = matches.get(header);
    const isDuplicate = duplicatedIndices.has(idx);
    const onCell = () =>
      isDuplicate ? { style: { backgroundColor: "#ff879b0f" } } : {};

    return {
      key: idx,
      dataIndex: idx,
      ellipsis: true,
      width: minColWidth,
      onHeaderCell: onCell,
      onCell: onCell,
      title: (
        <div>
          <div
            style={{
              color: isDuplicate ? "#f8575a" : match ? "inherit" : "#aaa",
              borderBottom: "1px solid #f0f0f0",
              paddingBottom: "3px",
              marginBottom: "3px",
            }}
          >
            {isDuplicate
              ? `${msgDuplicate}: ${match!.label}`
              : match
                ? `${msgMatched}: ${match.label}`
                : msgNoMatch}
          </div>
          <div>{header}</div>
        </div>
      ),
    };
  });

  const dataSource = parsed.rows.map((row, rowIdx) => ({
    key: rowIdx,
    ...Object.fromEntries(row.map((cell, idx) => [idx, cell])),
  }));

  return (
    <div style={containerStyle}>
      <Table
        bordered
        size="small"
        columns={columns}
        dataSource={dataSource}
        style={{ minWidth: tableWidth }}
      />
    </div>
  );
}

CsvPreviewTable.displayName = "CsvPreviewTable";
