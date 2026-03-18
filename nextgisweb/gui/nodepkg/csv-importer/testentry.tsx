/** @testentry react */
import { useState } from "react";

import { CsvImporter } from "./CsvImporter";
import type { CsvColumn } from "./type";

const columns: CsvColumn[] = [
  {
    key: "key",
    label: "Key",
    aliases: ["Key", "key", "id", "ID"],
  },
  {
    key: "value",
    label: "Value",
    aliases: ["Value", "value", "label", "Label"],
  },
];

export default function CsvImporterTestEntry() {
  const [_rows, setRows] = useState<Record<string, string>[] | undefined>(
    undefined
  );

  return (
    <div style={{ maxWidth: "1000px" }}>
      <CsvImporter columns={columns} onChange={setRows} />
    </div>
  );
}
