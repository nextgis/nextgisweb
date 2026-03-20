/** @testentry react */
import { useState } from "react";

import { Button, Divider, Input, Space } from "@nextgisweb/gui/antd";

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

export default function CsvImporterTestEntry() {
  const [columns, setColumns] = useState<CsvColumn[]>(DEFAULT_COLUMNS);
  const [aliasesRaw, setAliasesRaw] = useState<string[]>(
    DEFAULT_COLUMNS.map((c) => c.aliases.join(", "))
  );
  const [rows, setRows] = useState<Record<string, string>[] | undefined>(
    undefined
  );
  const [copyLabel, setCopyLabel] = useState("Copy JSON");
  const [pasteLabel, setPasteLabel] = useState("Paste JSON");
  const [pasteDanger, setPasteDanger] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(columns, null, 2));
    setCopyLabel("Copied!");
    setTimeout(() => setCopyLabel("Copy JSON"), 1500);
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
        setPasteLabel("Invalid JSON!");
        setPasteDanger(true);
        setTimeout(() => {
          setPasteLabel("Paste JSON");
          setPasteDanger(false);
        }, 2000);
      }
    } catch {
      setPasteLabel("Invalid JSON!");
      setPasteDanger(true);
      setTimeout(() => {
        setPasteLabel("Paste JSON");
        setPasteDanger(false);
      }, 2000);
    }
  };

  const updateField = (idx: number, field: "key" | "label", value: string) => {
    setColumns((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const commitAliases = (idx: number, raw: string) => {
    const aliases = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setAliasesRaw((prev) => {
      const n = [...prev];
      n[idx] = aliases.join(", ");
      return n;
    });
    setColumns((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], aliases };
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

  return (
    <div
      style={{
        maxWidth: "900px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <Divider titlePlacement="left" style={{ margin: 0 }}>
        {"Component"}
      </Divider>

      <CsvImporter columns={columns} onChange={setRows} />

      <Divider titlePlacement="left" style={{ margin: 0 }}>
        {"Column configuration"}
      </Divider>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Space size="small">
            <Button size="small" onClick={handleCopy}>
              {copyLabel}
            </Button>
            <Button size="small" danger={pasteDanger} onClick={handlePaste}>
              {pasteLabel}
            </Button>
          </Space>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ width: 120, fontSize: "12px", color: "#888" }}>
            {"Key"}
          </div>
          <div style={{ width: 120, fontSize: "12px", color: "#888" }}>
            {"Label"}
          </div>
          <div style={{ flex: 1, fontSize: "12px", color: "#888" }}>
            {"Aliases"}
          </div>
        </div>
        {columns.map((col, idx) => (
          <div key={idx} style={{ display: "flex", gap: "8px" }}>
            <Input
              size="small"
              value={col.key}
              onChange={(e) => updateField(idx, "key", e.target.value)}
              style={{ width: 120 }}
            />
            <Input
              size="small"
              value={col.label}
              onChange={(e) => updateField(idx, "label", e.target.value)}
              style={{ width: 120 }}
            />
            <Input
              size="small"
              value={aliasesRaw[idx]}
              onChange={(e) =>
                setAliasesRaw((prev) => {
                  const n = [...prev];
                  n[idx] = e.target.value;
                  return n;
                })
              }
              onBlur={(e) => commitAliases(idx, e.target.value)}
              style={{ flex: 1 }}
            />
            <Button size="small" danger onClick={() => removeColumn(idx)}>
              {"Delete"}
            </Button>
          </div>
        ))}
        <div>
          <Button size="small" onClick={addColumn}>
            + {"Add column"}
          </Button>
        </div>
      </div>

      <Divider titlePlacement="left" style={{ margin: 0 }}>
        {"onChange output"}
        {rows !== undefined ? ` — ${rows.length} rows` : ""}
      </Divider>

      {rows === undefined ? (
        <span style={{ color: "#aaa", fontSize: "13px" }}>{"Undefined"}</span>
      ) : (
        <pre
          style={{
            margin: 0,
            fontSize: "12px",
            maxHeight: "200px",
            overflowY: "auto",
            background: "#fafafa",
            border: "1px solid #f0f0f0",
            borderRadius: "4px",
            padding: "8px",
          }}
        >
          {JSON.stringify(rows, null, 2)}
        </pre>
      )}
    </div>
  );
}
