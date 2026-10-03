import { lazy, useState } from "react";

import settings from "@nextgisweb/feature-layer/client-settings";
import { useShowModal } from "@nextgisweb/gui";
import { Button, Checkbox, Dropdown } from "@nextgisweb/gui/antd";
import type { DropdownProps, SizeType } from "@nextgisweb/gui/antd";
import { ExportIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ComputeMapExtent } from "@nextgisweb/webmap/component/ComputeMapExtent";
import { useOptionalDisplayContext } from "@nextgisweb/webmap/display/context";

import { useExportFeatureLayer } from "../../hook/useExportFeatureLayer";
import type { ExportFeatureLayerOptions } from "../../hook/useExportFeatureLayer";
import type { QueryParams } from "../hook/useFeatureTable";

interface ExportActionProps {
  id: number;
  queryParams: QueryParams | null;
  size?: SizeType;
  isFit?: boolean;
}

const { exportFormats } = settings;

const ExportModal = lazy(() => import("@nextgisweb/resource/export-modal"));

const formatItems = exportFormats.map((format) => ({
  key: format.name,
  label: format.display_name,
}));

const msgExport = gettext("Export");
const msgExportAdvanced = gettext("Advanced export");
const msgUseFilters = gettext("Use filters");

const settingsKey = "go-to-settings";
const filterKeys: (keyof QueryParams)[] = [
  "filter",
  "ilike",
  "like",
  "intersects",
];

export const ExportAction = ({
  id,
  size = "middle",
  isFit,
  queryParams,
}: ExportActionProps) => {
  const [useFilters, setUseFilters] = useState(true);
  const { exportFeatureLayer, exportLoading } = useExportFeatureLayer({ id });
  const { showModal, modalHolder } = useShowModal();
  const displayContext = useOptionalDisplayContext();

  const isFilterSet = filterKeys.some((key) => !!queryParams?.[key]);

  const menuProps: DropdownProps["menu"] = {
    style: isFilterSet ? { boxShadow: "none" } : undefined,
    items: [
      ...formatItems,
      {
        type: "divider",
      },
      {
        key: settingsKey,
        label: msgExportAdvanced,
      },
    ],
    onClick: (e) => {
      const params: ExportFeatureLayerOptions & QueryParams = queryParams
        ? { ...queryParams }
        : {};
      if (e.key === settingsKey) {
        showModal(ExportModal, {
          resourceId: id,
          params,
          renderExtentButton: displayContext
            ? (onDone) => (
                <ComputeMapExtent
                  display={displayContext.display}
                  onDone={onDone}
                />
              )
            : undefined,
        });
      } else {
        if (!useFilters) {
          for (const key of filterKeys) {
            delete params[key];
          }
        }
        exportFeatureLayer({
          ...params,
          format: e.key,
        });
      }
    },
  };

  return (
    <>
      {modalHolder}
      <Dropdown
        menu={menuProps}
        popupRender={
          isFilterSet
            ? (menu) => (
                <div className="ant-dropdown-menu">
                  <Checkbox
                    className="ant-dropdown-menu-item"
                    checked={useFilters}
                    onChange={(e) => setUseFilters(e.target.checked)}
                  >
                    {msgUseFilters}
                  </Checkbox>
                  {menu}
                </div>
              )
            : undefined
        }
      >
        <Button icon={<ExportIcon />} size={size} loading={exportLoading}>
          {isFit && msgExport}
        </Button>
      </Dropdown>
    </>
  );
};
