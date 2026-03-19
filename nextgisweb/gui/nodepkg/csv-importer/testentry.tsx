/** @testentry react */
import { useState } from "react";

import { Button, Input, Space, Table } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { CsvImporter } from "./CsvImporter";
import type { CsvColumn } from "./type";

const DEFAULT_COLUMNS: CsvColumn[] = [
  { key: "key", label: "Key", aliases: ["Key", "key", "id", "ID"] },
  {
    key: "value",
    label: "Value",
    aliases: ["Value", "value", "label", "Label"],
  },
];

const msgKey = gettext("Key");
const msgLabel = gettext("Label");
const msgAliases = gettext("Aliases");
const msgAddColumn = gettext("Add column");
const msgCopyJson = gettext("Copy JSON");
const msgPasteJson = gettext("Paste JSON");
const msgCopied = gettext("Copied!");
const msgPasteError = gettext("Invalid JSON!");
const msgDelete = gettext("Delete");
const msgConfigTitle = gettext("Column configuration");
const msgPreviewTitle = gettext("Component preview");

const sectionStyle: React.CSSProperties = {
  border: "1px solid #d9d9d9",
  borderRadius: "8px",
  marginBottom: "16px",
  overflow: "hidden",
};

const sectionHeaderStyle: React.CSSProperties = {
  background: "#fafafa",
  borderBottom: "1px solid #d9d9d9",
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "13px",
  color: "#444",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const sectionBodyStyle: React.CSSProperties = {
  padding: "12px",
};

type RowRecord = {
  key: string;
  label: string;
  aliasesRaw: string;
  _idx: number;
};

export default function CsvImporterTestEntry() {
  const [columns, setColumns] = useState<CsvColumn[]>(DEFAULT_COLUMNS);
  const [aliasesRaw, setAliasesRaw] = useState<string[]>(
    DEFAULT_COLUMNS.map((c) => c.aliases.join(", "))
  );
  const [_rows, setRows] = useState<Record<string, string>[] | undefined>(
    undefined
  );
  const [copyLabel, setCopyLabel] = useState(msgCopyJson);
  const [pasteLabel, setPasteLabel] = useState(msgPasteJson);
  const [pasteDanger, setPasteDanger] = useState(false);

  const updateField = (idx: number, field: "key" | "label", value: string) => {
    setColumns((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const updateAliasesRaw = (idx: number, raw: string) => {
    setAliasesRaw((prev) => {
      const next = [...prev];
      next[idx] = raw;
      return next;
    });
  };

  const commitAliases = (idx: number, raw: string) => {
    const parsed = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const normalized = parsed.join(", ");
    setAliasesRaw((prev) => {
      const n = [...prev];
      n[idx] = normalized;
      return n;
    });
    setColumns((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], aliases: parsed };
      return next;
    });
  };

  const addColumn = () => {
    setColumns((prev) => [...prev, { key: "", label: "", aliases: [] }]);
    setAliasesRaw((prev) => [...prev, ""]);
  };

  const removeColumn = (idx: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== idx));
    setAliasesRaw((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(columns, null, 2));
    setCopyLabel(msgCopied);
    setTimeout(() => setCopyLabel(msgCopyJson), 1500);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (c) =>
            typeof c.key === "string" &&
            typeof c.label === "string" &&
            Array.isArray(c.aliases)
        )
      ) {
        setColumns(parsed);
        setAliasesRaw(parsed.map((c: CsvColumn) => c.aliases.join(", ")));
      } else {
        setPasteLabel(msgPasteError);
        setPasteDanger(true);
        setTimeout(() => {
          setPasteLabel(msgPasteJson);
          setPasteDanger(false);
        }, 2000);
      }
    } catch {
      setPasteLabel(msgPasteError);
      setPasteDanger(true);
      setTimeout(() => {
        setPasteLabel(msgPasteJson);
        setPasteDanger(false);
      }, 2000);
    }
  };

  const tableColumns = [
    {
      title: msgKey,
      dataIndex: "key",
      width: 150,
      render: (_: unknown, row: RowRecord) => (
        <Input
          size="small"
          value={columns[row._idx].key}
          onChange={(e) => updateField(row._idx, "key", e.target.value)}
        />
      ),
    },
    {
      title: msgLabel,
      dataIndex: "label",
      width: 150,
      render: (_: unknown, row: RowRecord) => (
        <Input
          size="small"
          value={columns[row._idx].label}
          onChange={(e) => updateField(row._idx, "label", e.target.value)}
        />
      ),
    },
    {
      title: msgAliases,
      dataIndex: "aliasesRaw",
      render: (_: unknown, row: RowRecord) => (
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <Input
            size="small"
            value={aliasesRaw[row._idx]}
            onChange={(e) => updateAliasesRaw(row._idx, e.target.value)}
            onBlur={(e) => commitAliases(row._idx, e.target.value)}
          />
          <Button size="small" danger onClick={() => removeColumn(row._idx)}>
            {msgDelete}
          </Button>
        </div>
      ),
    },
  ];

  const dataSource: RowRecord[] = columns.map((col, i) => ({
    ...col,
    aliasesRaw: aliasesRaw[i],
    _idx: i,
  }));

  return (
    <div style={{ maxWidth: "1000px", padding: "16px" }}>
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={sectionTitleStyle}>{msgPreviewTitle}</span>
        </div>
        <div style={sectionBodyStyle}>
          <CsvImporter columns={columns} onChange={setRows} />
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={sectionTitleStyle}>{msgConfigTitle}</span>
          <Space size="small" style={{ marginLeft: "auto" }}>
            <Button size="small" onClick={handleCopy}>
              {copyLabel}
            </Button>
            <Button size="small" danger={pasteDanger} onClick={handlePaste}>
              {pasteLabel}
            </Button>
          </Space>
        </div>
        <div style={sectionBodyStyle}>
          <Table
            size="small"
            bordered
            pagination={false}
            columns={tableColumns}
            dataSource={dataSource}
            rowKey="_idx"
            style={{ marginBottom: "8px" }}
          />
          <Button size="small" onClick={addColumn}>
            + {msgAddColumn}
          </Button>
        </div>
      </div>
    </div>
  );
}
