import { Button, Dropdown, Space, Tooltip } from "@nextgisweb/gui/antd";

import settings from "@nextgisweb/pyramid/settings!feature_layer";
import i18n from "@nextgisweb/pyramid/i18n";

import { useExportFeatureLayer } from "../../hook/useExportFeatureLayer";

import ExportIcon from "@material-icons/svg/save_alt";
import FilterIcon from "@material-icons/svg/filter_alt";

import type { ParamsOf } from "@nextgisweb/gui/type";
import type { SizeType } from "@nextgisweb/gui/antd";
import type { ExportFeatureLayerOptions } from "../../hook/useExportFeatureLayer";

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

const exportTitleMsg = i18n.gettext("Save as");
const gotToSettingsTitleMsg = i18n.gettext("Advanced Export");
const quickExportTitleMsg = i18n.gettext("Quick Export");
const filtersApplyiedTitleMsg = i18n.gettext("Filters are applied");

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
                label: gotToSettingsTitleMsg,
            },
            {
                type: "divider",
            },
            {
                key: quickExportKey,
                label: (
                    <Space>
                        {quickExportTitleMsg}
                        {isFilterSet && (
                            <Tooltip title={filtersApplyiedTitleMsg}>
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
                {exportTitleMsg}
            </Button>
        </Dropdown>
    );
};
