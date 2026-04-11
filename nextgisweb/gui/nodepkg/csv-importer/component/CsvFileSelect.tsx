import { useCallback } from "react";

import { Upload } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import "@nextgisweb/file-upload/file-uploader/FileUploader.less";

const { Dragger } = Upload;

const msgSelectFile = gettext("Select a CSV file");
const msgDragAndDrop = gettext("or drag and drop here");
const msgWrongType = gettext("Please select a CSV file");

export interface CsvFileSelectProps {
  onChange: (file: File) => void;
}

export function CsvFileSelect({ onChange }: CsvFileSelectProps) {
  const handleBeforeUpload = useCallback(
    (f: File) => {
      if (!f.name.match(/\.(csv)$/i)) {
        console.warn(msgWrongType);
        return Upload.LIST_IGNORE;
      }
      onChange(f);
      return false;
    },
    [onChange]
  );

  return (
    <Dragger
      accept=".csv"
      showUploadList={false}
      className="ngw-file-upload-file-uploader csv-file-select"
      beforeUpload={handleBeforeUpload}
    >
      <p className="ant-upload-text">
        <span className="clickable">{msgSelectFile}</span> {msgDragAndDrop}
      </p>
    </Dragger>
  );
}
