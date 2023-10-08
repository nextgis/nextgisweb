import { Button, Dropdown, Space, Tooltip } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!feature_layer";

import { useExportFeatureLayer } from "../../hook/useExportFeatureLayer";

import type { SizeType } from "@nextgisweb/gui/antd";
import type { ParamsOf } from "@nextgisweb/gui/type";
import type { ExportFeatureLayerOptions } from "../../hook/useExportFeatureLayer";

import FilterIcon from "@nextgisweb/icon/material/filter_alt";
import ExportIcon from "@nextgisweb/icon/material/save_alt";

type MenuItems = ParamsOf<typeof Dropdown>["menu"];

interface ExportActionProps {
    id: number;
    query: string;
    size?: SizeType;
}

const exportFormats = settings.export_formats;

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
    query,
    size = "middle",
}: ExportActionProps) => {
    const { exportFeatureLayer, openExportPage, exportLoading } =
        useExportFeatureLayer({ id });

    const isFilterSet = query;

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
            const params: ExportFeatureLayerOptions = { ilike: query };
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
                {msgExport}
            </Button>
        </Dropdown>
    );
};
