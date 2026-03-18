import { Spin, Table } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { CsvColumn, CsvParsingOutput } from "../type";

import { LoadingOutlined } from "@ant-design/icons";

const msgNoMatch = gettext("No match");
const msgMatched = gettext("Matched");

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
    overflow: "auto",
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

  const columns = parsed.headers.map((header, idx) => {
    const match = matches.get(header);
    return {
      key: idx,
      dataIndex: idx,
      ellipsis: true,
      title: (
        <div>
          <div
            style={{
              color: match ? "inherit" : "#aaa",
              borderBottom: "1px solid #f0f0f0",
              paddingBottom: "3px",
              marginBottom: "3px",
            }}
          >
            {match ? `${msgMatched}: ${match.label}` : msgNoMatch}
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
        style={{ width: "100%" }}
      />
    </div>
  );
}

CsvPreviewTable.displayName = "CsvPreviewTable";
