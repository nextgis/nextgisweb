import settings from "@nextgisweb/feature-layer/client-settings";
import { Button, Dropdown, Space, Tooltip } from "@nextgisweb/gui/antd";
import type { SizeType } from "@nextgisweb/gui/antd";
import { ExportIcon } from "@nextgisweb/gui/icon";
import type { ParamsOf } from "@nextgisweb/gui/type";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { useExportFeatureLayer } from "../../hook/useExportFeatureLayer";
import type { ExportFeatureLayerOptions } from "../../hook/useExportFeatureLayer";
import type { QueryParams } from "../hook/useFeatureTable";

import FilterIcon from "@nextgisweb/icon/material/filter_alt";

type MenuItems = ParamsOf<typeof Dropdown>["menu"];

interface ExportActionProps {
    id: number;
    queryParams: QueryParams | null;
    size?: SizeType;
    isFit?: boolean;
}

const { exportFormats } = settings;

const formatItems = exportFormats.map((format) => ({
    key: format.name,
    label: format.display_name,
}));

const msgExport = gettext("Save as");
const msgExportAdvanced = gettext("Advanced Export");
const msgExportQuick = gettext("Quick Export");
const msgFiltersApplied = gettext("Filters are applied");

const settingsKey = "go-to-settings";
const quickExportKey = "quick-export";

export const ExportAction = ({
    id,
    queryParams,
    isFit,
    size = "middle",
}: ExportActionProps) => {
    const { exportFeatureLayer, openExportPage, exportLoading } =
        useExportFeatureLayer({ id });

    const isFilterSet =
        !!queryParams && Object.values(queryParams).some(Boolean);

    const menuProps: MenuItems = {
        items: [
            {
                key: settingsKey,
                label: msgExportAdvanced,
            },
            {
                type: "divider",
            },
            {
                key: quickExportKey,
                label: (
                    <Space>
                        {msgExportQuick}
                        {isFilterSet && (
                            <Tooltip title={msgFiltersApplied}>
                                <FilterIcon />
                            </Tooltip>
                        )}
                    </Space>
                ),
                children: formatItems,
            },
        ],
        onClick: (e) => {
            const params: ExportFeatureLayerOptions = queryParams
                ? { ...queryParams }
                : {};
            if (e.key === settingsKey) {
                openExportPage(params);
            } else {
                params.format = e.key;
                exportFeatureLayer(params);
            }
        },
    };

    return (
        <Dropdown menu={menuProps}>
            <Button icon={<ExportIcon />} size={size} loading={exportLoading}>
                {isFit && msgExport}
            </Button>
        </Dropdown>
    );
};
