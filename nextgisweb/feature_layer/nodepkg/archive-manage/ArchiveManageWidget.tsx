import { useState } from "react";
import type { ReactNode } from "react";

import {
  Button,
  Checkbox,
  Tabs,
  Typography,
  Upload,
} from "@nextgisweb/gui/antd";
import type { UploadProps } from "@nextgisweb/gui/antd";
import showModal from "@nextgisweb/gui/showModal";
import type { RouteName, RouteResp } from "@nextgisweb/pyramid/api/type";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ArchiveImportModal } from "./ArchiveImportModal";
import { useArchiveExport } from "./hook/useArchiveExport";
import { useArchiveImport } from "./hook/useArchiveImport";

export interface ArchiveManageWidgetProps<
  EN extends RouteName,
  IN extends RouteName,
> {
  id: number;
  exportRoute: EN;
  exportHelpMsg: string;
  exportButtonMsg: string;
  importRoute: IN;
  importHelpMsg: string;
  importButtonMsg: string;
  deleteMsg: string;
  renderImportResult?: (result: RouteResp<IN, "put">) => ReactNode;
}

const msgExport = gettext("Export");
const msgImport = gettext("Import");

export function ArchiveManageWidget<
  EN extends RouteName,
  IN extends RouteName,
>({
  id,
  exportRoute,
  exportHelpMsg,
  exportButtonMsg,
  importRoute,
  importHelpMsg,
  importButtonMsg,
  deleteMsg,
  renderImportResult,
}: ArchiveManageWidgetProps<EN, IN>) {
  const { loading: exportLoading, doExport } = useArchiveExport(exportRoute, {
    id,
  });
  const { loading: importLoading, doImport } = useArchiveImport(importRoute, {
    id,
  });
  const [replace, setReplace] = useState(false);

  const handleUploadChange: UploadProps["onChange"] = async ({ file }) => {
    const { status, originFileObj } = file;
    if (status !== "done" || !originFileObj) return;

    const result = await doImport(originFileObj, replace);
    if (result !== undefined) {
      const { destroy } = showModal(ArchiveImportModal, {
        resourceId: id,
        onCancel: () => destroy(),
        children: renderImportResult?.(result),
      });
    }
  };

  return (
    <Tabs
      size="large"
      items={[
        {
          key: "export",
          label: msgExport,
          children: (
            <>
              <Typography.Paragraph style={{ maxWidth: "50em" }}>
                {exportHelpMsg}
              </Typography.Paragraph>
              <Button
                type="primary"
                disabled={importLoading}
                loading={exportLoading}
                onClick={doExport}
              >
                {exportButtonMsg}
              </Button>
            </>
          ),
        },
        {
          key: "import",
          label: msgImport,
          children: (
            <>
              <Typography.Paragraph style={{ maxWidth: "50em" }}>
                {importHelpMsg}
              </Typography.Paragraph>
              <div style={{ marginBottom: "1em" }}>
                <Checkbox
                  disabled={importLoading}
                  checked={replace}
                  onChange={(e) => setReplace(e.target.checked)}
                >
                  {deleteMsg}
                </Checkbox>
              </div>
              <Upload
                multiple={false}
                showUploadList={false}
                customRequest={({ file, onSuccess }) => {
                  if (onSuccess) {
                    onSuccess(file);
                  }
                }}
                onChange={handleUploadChange}
              >
                <Button
                  type="primary"
                  danger={replace}
                  disabled={exportLoading}
                  loading={importLoading}
                >
                  {importButtonMsg}
                </Button>
              </Upload>
            </>
          ),
        },
      ]}
    />
  );
}
