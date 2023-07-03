import { PropTypes } from "prop-types";

import { Button, Dropdown, Space, Tooltip } from "@nextgisweb/gui/antd";

import settings from "@nextgisweb/pyramid/settings!feature_layer";
import i18n from "@nextgisweb/pyramid/i18n";

import { useExportFeatureLayer } from "../../hook/useExportFeatureLayer";

import ExportIcon from "@material-icons/svg/save_alt";
import FilterIcon from "@material-icons/svg/filter_alt";

const exportFormats = settings.export_formats;

let formatItems = exportFormats.map((format) => ({
    key: format.name,
    label: format.display_name,
}));

const exportTitleMsg = i18n.gettext("Save as");
const gotToSettingsTitleMsg = i18n.gettext("Advanced Export");
const quickExportTitleMsg = i18n.gettext("Quick Export");
const filtersApplyiedTitleMsg = i18n.gettext("Filters are applied");

const settingsKey = "go-to-settings";
const quickExportKey = "quick-export";

export const ExportAction = ({ id, query, size = "middle" }) => {
    const { exportFeatureLayer, openExportPage, exportLoading } =
        useExportFeatureLayer({ id });

    const isFilterSet = query;

    const handleMenuClick = (e) => {
        const params = { ilike: query };
        if (e.key === settingsKey) {
            openExportPage(params);
        } else {
            params.format = e.key;
            exportFeatureLayer(params);
        }
    };

    const menuProps = {
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
        onClick: handleMenuClick,
    };

    return (
        <Dropdown menu={menuProps}>
            <Button icon={<ExportIcon />} size={size} loading={exportLoading}>
                {exportTitleMsg}
            </Button>
        </Dropdown>
    );
};

ExportAction.propTypes = {
    query: PropTypes.string,
    id: PropTypes.number,
    size: PropTypes.oneOf(["small", "middle", "large"]),
};
