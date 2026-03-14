import { Button } from "@nextgisweb/gui/antd";
import { formatSize } from "@nextgisweb/gui/util/formatSize";
import { gettext } from "@nextgisweb/pyramid/i18n";

import BackspaceIcon from "@nextgisweb/icon/material/backspace";

const msgClearFile = gettext("Clear file");

export interface CsvFileNameProps {
  file: File;
  onClear: () => void;
}

export function CsvFileName({ file, onClear }: CsvFileNameProps) {
  return (
    <div style={{ display: "flex", alignItems: "baseline" }}>
      <span
        style={{ fontSize: "18px", marginLeft: "auto", marginRight: "6px" }}
      >
        {file.name}
      </span>
      <span style={{ fontSize: "14px" }}>{formatSize(file.size)}</span>
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
