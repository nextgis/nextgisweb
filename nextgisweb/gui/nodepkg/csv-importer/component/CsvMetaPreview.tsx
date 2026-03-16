import { Button } from "@nextgisweb/gui/antd";
import { formatSize } from "@nextgisweb/gui/util/formatSize";
import { gettext } from "@nextgisweb/pyramid/i18n";

import BackspaceIcon from "@nextgisweb/icon/material/backspace";

const msgClearFile = gettext("Clear file");
const msgRowsInFile = gettext("Rows in file");

export interface CsvFileNameProps {
  file: File;
  onClear: () => void;
  rowsCount?: number;
}

export function CsvMetaPreview({ file, onClear, rowsCount }: CsvFileNameProps) {
  return (
    <div style={{ display: "flex", alignItems: "baseline" }}>
      {rowsCount !== undefined && (
        <span style={{ fontSize: "18px" }}>
          {msgRowsInFile}: {rowsCount}
        </span>
      )}

      <span
        style={{ fontSize: "18px", marginLeft: "auto", marginRight: "6px" }}
      >
        {file.name}
      </span>

      <span style={{ fontSize: "14px", marginRight: "8px" }}>
        {formatSize(file.size)}
      </span>

      <Button
        title={msgClearFile}
        type="link"
        icon={<BackspaceIcon />}
        onClick={onClear}
        style={{ fontSize: "14px" }}
      />
    </div>
  );
}
